/**
 * Election Education — Chat Module
 *
 * Manages the AI chat interface including:
 * - API key storage (sessionStorage only for security)
 * - Message rendering with sanitization
 * - Gemini API integration via server proxy
 * - Quick question handling
 *
 * @module chat
 * @author Mamidi Vashisht
 */

/* global ElectionData */
/* exported ChatModule */
const ChatModule = (() => {
  'use strict';

  let apiKey = '';
  let isProcessing = false;

  /* ─── DOM References ─── */
  const els = {};

  function cacheDom() {
    els.input = document.getElementById('chat-input');
    els.sendBtn = document.getElementById('chat-send');
    els.messages = document.getElementById('chat-messages');
    els.apiInput = document.getElementById('api-key-input');
    els.apiSave = document.getElementById('api-key-save');
    els.apiStatus = document.getElementById('api-status');
    els.quickQuestions = document.getElementById('quick-questions');
  }

  /* ─── Sanitization ─── */

  /**
   * Escapes HTML special characters to prevent XSS.
   * @param {string} str - Raw string
   * @returns {string} Escaped string
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Converts basic markdown-like formatting to HTML.
   * @param {string} text - AI response text
   * @returns {string} Formatted HTML
   */
  function formatResponse(text) {
    let html = escapeHtml(text);
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Bullet points
    html = html.replace(/^[•\-\*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    // Numbered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
  }

  /* ─── Message Rendering ─── */

  function addMessage(content, type) {
    const msg = document.createElement('div');
    msg.className = `chat__message chat__message--${type}`;
    msg.setAttribute('role', 'article');

    if (type === 'bot') {
      msg.innerHTML = formatResponse(content);
    } else {
      msg.textContent = content;
    }

    els.messages.appendChild(msg);
    els.messages.scrollTop = els.messages.scrollHeight;
    return msg;
  }

  function showTyping() {
    const msg = document.createElement('div');
    msg.className = 'chat__message chat__message--bot chat__message--typing';
    msg.id = 'typing-indicator';
    msg.setAttribute('aria-label', 'AI is thinking');
    msg.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    els.messages.appendChild(msg);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function hideTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  /* ─── API Communication ─── */

  async function sendToGemini(message) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, apiKey })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      return data.reply;
    } catch (err) {
      console.error('[Chat Error]', err.message);

      // Fallback: try local data search
      const localResults = ElectionData.search(message);
      if (localResults.length > 0) {
        const result = localResults[0];
        if (result.type === 'faq') {
          return `**${result.data.q}**\n\n${result.data.a}\n\n_(Answered from local knowledge base — AI service may be temporarily unavailable)_`;
        }
        if (result.type === 'phase') {
          return `**${result.data.title}** (${result.data.duration})\n\n${result.data.description}\n\n${result.data.keyPoints.map(p => `• ${p}`).join('\n')}\n\n_(From local knowledge base)_`;
        }
      }

      return 'I\'m having trouble connecting to the AI service right now. Please check your API key and try again. You can also browse the information sections above for quick answers.';
    }
  }

  /* ─── Event Handlers ─── */

  async function handleSend() {
    const message = els.input.value.trim();
    if (!message || isProcessing) return;
    if (!apiKey) {
      addMessage('Please connect your Gemini API key first to use the AI assistant.', 'bot');
      return;
    }

    isProcessing = true;
    els.sendBtn.disabled = true;
    els.input.value = '';
    els.input.style.height = 'auto';

    addMessage(message, 'user');
    showTyping();

    const reply = await sendToGemini(message);

    hideTyping();
    addMessage(reply, 'bot');

    isProcessing = false;
    els.sendBtn.disabled = false;
    els.input.focus();
  }

  function handleApiSave() {
    const key = els.apiInput.value.trim();
    if (!key) {
      els.apiStatus.innerHTML = '<span class="api-setup__status--error">⚠️ Please enter a valid API key.</span>';
      return;
    }

    apiKey = key;
    // Store in sessionStorage only (cleared when tab closes)
    try {
      sessionStorage.setItem('gemini_api_key', key);
    } catch (e) {
      // sessionStorage may be unavailable in some contexts
    }

    els.apiStatus.innerHTML = '<span class="api-setup__status--connected">✅ Connected! You can now use the AI assistant.</span>';
    els.sendBtn.disabled = false;
    els.apiInput.value = '';
    els.apiInput.type = 'text';
    els.apiInput.value = '••••••••••••';
    els.apiInput.disabled = true;
    els.apiSave.textContent = 'Disconnect';
    els.apiSave.onclick = handleApiDisconnect;
  }

  function handleApiDisconnect() {
    apiKey = '';
    try { sessionStorage.removeItem('gemini_api_key'); } catch (e) {}
    els.apiInput.disabled = false;
    els.apiInput.type = 'password';
    els.apiInput.value = '';
    els.apiSave.textContent = 'Connect';
    els.apiSave.onclick = handleApiSave;
    els.apiStatus.innerHTML = '<span class="api-setup__status--error">🔌 Disconnected.</span>';
    els.sendBtn.disabled = true;
  }

  function handleQuickQuestion(e) {
    const btn = e.target.closest('.quick-questions__btn');
    if (!btn) return;
    const question = btn.dataset.question;
    if (question) {
      els.input.value = question;
      handleSend();
    }
  }

  function autoResize() {
    els.input.style.height = 'auto';
    els.input.style.height = Math.min(els.input.scrollHeight, 120) + 'px';
  }

  /* ─── Init ─── */

  function init() {
    cacheDom();

    // Restore API key from session
    try {
      const saved = sessionStorage.getItem('gemini_api_key');
      if (saved) {
        apiKey = saved;
        els.apiInput.disabled = true;
        els.apiInput.type = 'text';
        els.apiInput.value = '••••••••••••';
        els.apiSave.textContent = 'Disconnect';
        els.apiSave.onclick = handleApiDisconnect;
        els.apiStatus.innerHTML = '<span class="api-setup__status--connected">✅ Connected (restored from session).</span>';
        els.sendBtn.disabled = false;
      }
    } catch (e) {}

    // Event listeners
    els.apiSave.addEventListener('click', handleApiSave);
    els.sendBtn.addEventListener('click', handleSend);
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
    els.input.addEventListener('input', autoResize);
    els.quickQuestions.addEventListener('click', handleQuickQuestion);
  }

  return { init };
})();
