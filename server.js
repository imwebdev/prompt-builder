const express = require('express');
const path = require('path');

// Load .env manually (no dotenv dependency)
const fs = require('fs');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      value = value.replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint for OpenRouter
app.post('/api/generate', async (req, res) => {
  if (!OPENROUTER_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured on server' });
  }

  const { model, systemPrompt, userPrompt } = req.body;

  if (!model || !systemPrompt || !userPrompt) {
    return res.status(400).json({ error: 'Missing required fields: model, systemPrompt, userPrompt' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://promptbuilder.aibuildmastery.com',
        'X-Title': 'Prompt Builder for Claude Code'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4096,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.error?.message || `OpenRouter returned ${response.status}`
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response generated.';
    res.json({ content, model: data.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Prompt Builder running at http://localhost:${PORT}`);
});
