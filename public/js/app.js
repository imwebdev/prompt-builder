/* ============================================
   PROMPT BUILDER — app.js
   ============================================ */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const ideaInput = $('#idea');
  const modelSelect = $('#model');
  const generateBtn = $('#generateBtn');
  const resultsSection = $('#results');
  const resultsModel = $('#resultsModel');
  const simpleOutput = $('#simple-output');
  const detailedOutput = $('#detailed-output');
  const toastEl = $('#toast');
  const toastMsg = $('#toastMsg');

  // Restore last model choice
  const savedModel = localStorage.getItem('pb_model');
  if (savedModel) modelSelect.value = savedModel;
  modelSelect.addEventListener('change', () => {
    localStorage.setItem('pb_model', modelSelect.value);
  });

  // System prompts
  const SIMPLE_SYSTEM = `You are a prompt engineering assistant. The user will give you a website idea. Generate a SHORT, CASUAL prompt that someone might type into Claude Code to build that website.

Rules:
- 1-3 sentences maximum
- Keep it vague and casual, like how a beginner would ask
- Don't include technical details, file structures, or design specs
- The prompt MUST ask for a static website using only plain HTML, CSS, and JavaScript — this site will be published to GitHub Pages, so no server-side code, no frameworks, no build tools
- Output ONLY the prompt text — no quotes, no explanation, no preamble`;

  const DETAILED_SYSTEM = `You are a prompt engineering assistant. The user will give you a website idea. Generate a DETAILED, COMPREHENSIVE, PRODUCTION-QUALITY prompt that someone would type into Claude Code to build that website.

CRITICAL CONSTRAINT: The website MUST be static — plain HTML, CSS, and vanilla JavaScript ONLY. It will be deployed to GitHub Pages. No server-side code, no React, no Next.js, no build tools, no npm. Just files that a browser can open directly.

Rules:
- Thorough and specific (300-600 words)
- Include: project file structure with index.html at the root, design requirements (colors, typography, layout), content sections, and technical requirements (semantic HTML, SEO, accessibility)
- Explicitly state: static HTML, CSS, and vanilla JavaScript only — no frameworks, no build tools, no dependencies
- Mention responsive design, mobile-first approach, and specific breakpoints
- Include GitHub Pages deployment requirements: relative paths only (never absolute like /page.html), a .nojekyll file in the root, and that the site must work when opened directly in a browser
- Mention using Google Fonts via <link> tags, placeholder images via picsum.photos or similar
- Use markdown formatting (headers, bullet points, code blocks) to structure the prompt
- Output ONLY the prompt text — no quotes, no explanation, no preamble`;

  // ---- API ----
  async function callAPI(systemPrompt, userPrompt, model) {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        systemPrompt,
        userPrompt
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    return data.content;
  }

  // ---- Toast ----
  let toastTimer;
  function showToast(msg) {
    toastMsg.textContent = msg;
    toastEl.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 4000);
  }

  // ---- Loading state ----
  function setLoading(el) {
    el.textContent = 'Generating prompt...';
    el.classList.add('loading');
  }

  function clearLoading(el) {
    el.classList.remove('loading');
  }

  // ---- Generate ----
  async function generate() {
    const idea = ideaInput.value.trim();
    if (!idea) {
      ideaInput.focus();
      return;
    }

    const model = modelSelect.value;
    const modelLabel = modelSelect.options[modelSelect.selectedIndex].text;

    // Show results, set loading
    resultsSection.classList.add('visible');
    resultsModel.textContent = modelLabel;
    setLoading(simpleOutput);
    setLoading(detailedOutput);
    generateBtn.disabled = true;
    generateBtn.querySelector('.cmd-btn-text').textContent = 'Working...';

    const userMsg = `Website idea: ${idea}`;

    // Fire both in parallel
    const simpleP = callAPI(SIMPLE_SYSTEM, userMsg, model)
      .then(text => {
        clearLoading(simpleOutput);
        simpleOutput.textContent = text;
      })
      .catch(err => {
        clearLoading(simpleOutput);
        simpleOutput.textContent = `Error: ${err.message}`;
      });

    const detailedP = callAPI(DETAILED_SYSTEM, userMsg, model)
      .then(text => {
        clearLoading(detailedOutput);
        detailedOutput.textContent = text;
      })
      .catch(err => {
        clearLoading(detailedOutput);
        detailedOutput.textContent = `Error: ${err.message}`;
      });

    await Promise.allSettled([simpleP, detailedP]);

    generateBtn.disabled = false;
    generateBtn.querySelector('.cmd-btn-text').textContent = 'Generate';

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- Copy ----
  function copy(btn) {
    const targetId = btn.dataset.target;
    const text = document.getElementById(targetId).textContent;
    if (!text || text === 'Generating prompt...' || text.startsWith('Your ')) return;

    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('copied');
      btn.querySelector('span').textContent = 'Copied!';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.querySelector('span').textContent = 'Copy';
      }, 2000);
    });
  }

  // ---- Fill example ----
  function fill(chipBtn) {
    ideaInput.value = chipBtn.textContent;
    ideaInput.focus();
    generate();
  }

  // ---- Keyboard shortcut ----
  ideaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !generateBtn.disabled) generate();
  });

  // ---- Expose to HTML onclick ----
  window.app = { generate, copy, fill };

})();
