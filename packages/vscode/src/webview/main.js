// @ts-check
/// <reference lib="dom" />

/**
 * Locus AI Chat Webview Script
 *
 * Communicates with the extension host via the VS Code webview API.
 * Receives streaming messages and renders them in real-time.
 */

(() => {
  // Acquire the VS Code API (available in webview context)
  // biome-ignore lint/correctness/noUndeclaredVariables: provided by VS Code webview runtime
  const vscode = acquireVsCodeApi();

  /** @type {HTMLElement} */
  const messagesContainer = document.getElementById("messages");
  /** @type {HTMLTextAreaElement} */
  const chatInput = document.getElementById("chat-input");
  /** @type {HTMLButtonElement} */
  const sendButton = document.getElementById("send-button");
  /** @type {HTMLButtonElement} */
  const resetButton = document.getElementById("reset-button");
  /** @type {HTMLButtonElement} */
  const newSessionButton = document.getElementById("new-session-button");
  /** @type {HTMLButtonElement} */
  const abortButton = document.getElementById("abort-button");
  /** @type {HTMLElement} */
  const welcomeScreen = document.getElementById("welcome");

  let isProcessing = false;
  /** @type {HTMLElement | null} */
  let currentAssistantBlock = null;
  /** @type {string} */
  let currentAssistantContent = "";

  // --- Markdown Rendering ---

  /**
   * Render basic markdown to HTML.
   * Handles: code blocks, inline code, bold, italic, headers, links, lists.
   */
  function renderMarkdown(text) {
    let html = escapeHtml(text);

    // Code blocks: ```lang\ncode\n```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
      const langLabel = lang ? `<span class="code-lang">${lang}</span>` : "";
      return `<pre class="code-block">${langLabel}<code>${code}</code></pre>`;
    });

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

    // Italic: *text* or _text_
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>");

    // Headers: # to ###
    html = html.replace(/^### (.+)$/gm, '<div class="md-h3">$1</div>');
    html = html.replace(/^## (.+)$/gm, '<div class="md-h2">$1</div>');
    html = html.replace(/^# (.+)$/gm, '<div class="md-h1">$1</div>');

    // Unordered lists: - item or * item
    html = html.replace(/^[-*] (.+)$/gm, '<div class="md-list-item">$1</div>');

    // Line breaks
    html = html.replace(/\n/g, "<br />");

    return html;
  }

  // --- Message Sending ---

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || isProcessing) return;

    setProcessing(true);
    hideWelcome();

    // Show user message
    appendUserMessage(text);

    // Send to extension
    vscode.postMessage({ type: "prompt", content: text });

    chatInput.value = "";
    chatInput.style.height = "36px";

    // Start assistant block
    currentAssistantContent = "";
    currentAssistantBlock = appendAssistantBlock();
  }

  // --- Message Rendering ---

  function appendUserMessage(content) {
    const el = document.createElement("div");
    el.className = "message message-user";
    el.innerHTML = `<div class="message-role">You</div><div class="message-content">${escapeHtml(content)}</div>`;
    messagesContainer.appendChild(el);
    scrollToBottom();
  }

  function appendAssistantBlock() {
    const el = document.createElement("div");
    el.className = "message message-assistant";
    el.innerHTML =
      '<div class="message-role">Locus</div><div class="message-content"></div>';
    messagesContainer.appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendToAssistantBlock(text) {
    if (!currentAssistantBlock) {
      currentAssistantBlock = appendAssistantBlock();
    }
    currentAssistantContent += text;
    const contentEl = currentAssistantBlock.querySelector(".message-content");
    if (contentEl) {
      contentEl.innerHTML = renderMarkdown(currentAssistantContent);
    }
    scrollToBottom();
  }

  function finalizeAssistantBlock() {
    if (currentAssistantBlock && currentAssistantContent) {
      const contentEl = currentAssistantBlock.querySelector(".message-content");
      if (contentEl) {
        contentEl.innerHTML = renderMarkdown(currentAssistantContent);
      }
    }
    currentAssistantBlock = null;
    currentAssistantContent = "";
  }

  function appendToolStatus(toolName, status, error) {
    const statusClass = `tool-status-${status}`;
    let icon = "~";
    if (status === "completed") icon = "\u2713";
    if (status === "failed") icon = "\u2717";
    if (status === "running") icon = "\u25CB";

    const el = document.createElement("div");
    el.className = `tool-status ${statusClass}`;
    el.innerHTML = `<span class="tool-status-icon">${icon}</span><span class="tool-status-name">${escapeHtml(toolName)}</span>${error ? `<span class="tool-status-error"> — ${escapeHtml(error)}</span>` : ""}`;
    messagesContainer.appendChild(el);
    scrollToBottom();
  }

  function appendThinkingIndicator() {
    removeThinkingIndicator();
    const el = document.createElement("div");
    el.className = "thinking-indicator";
    el.id = "thinking-indicator";
    el.innerHTML = 'Thinking<span class="thinking-dots"></span>';
    messagesContainer.appendChild(el);
    scrollToBottom();
  }

  function removeThinkingIndicator() {
    const existing = document.getElementById("thinking-indicator");
    if (existing) existing.remove();
  }

  function appendErrorMessage(error) {
    const el = document.createElement("div");
    el.className = "message message-error";
    el.innerHTML = `<div class="message-content">${escapeHtml(error)}</div>`;
    messagesContainer.appendChild(el);
    scrollToBottom();
  }

  function appendSystemMessage(content) {
    const el = document.createElement("div");
    el.className = "message message-system";
    el.textContent = content;
    messagesContainer.appendChild(el);
    scrollToBottom();
  }

  function appendTaskBanner(task) {
    const el = document.createElement("div");
    el.className = "task-banner";
    el.innerHTML = `<span class="task-banner-label">Task</span> <span class="task-banner-title">${escapeHtml(task.title)}</span>`;
    messagesContainer.appendChild(el);
    scrollToBottom();
  }

  // --- Helpers ---

  function setProcessing(value) {
    isProcessing = value;
    sendButton.disabled = value;
    chatInput.disabled = value;
    if (abortButton) {
      abortButton.style.display = value ? "flex" : "none";
    }
    if (!value) {
      chatInput.focus();
    }
  }

  function hideWelcome() {
    if (welcomeScreen) {
      welcomeScreen.style.display = "none";
    }
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // --- Event Handlers ---

  sendButton.addEventListener("click", sendMessage);

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "36px";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`;
  });

  resetButton.addEventListener("click", () => {
    vscode.postMessage({ type: "resetContext" });
  });

  newSessionButton.addEventListener("click", () => {
    vscode.postMessage({ type: "newSession" });
  });

  if (abortButton) {
    abortButton.addEventListener("click", () => {
      vscode.postMessage({ type: "abort" });
    });
  }

  // --- Message Handling from Extension ---

  window.addEventListener("message", (event) => {
    const msg = event.data;

    switch (msg.type) {
      case "text_delta":
        removeThinkingIndicator();
        appendToAssistantBlock(msg.content || "");
        break;

      case "tool_start":
        removeThinkingIndicator();
        appendToolStatus(msg.tool || "unknown", "running");
        break;

      case "tool_complete":
        appendToolStatus(msg.tool || "unknown", "completed");
        break;

      case "tool_fail":
        appendToolStatus(msg.tool || "unknown", "failed", msg.error);
        break;

      case "thinking":
        appendThinkingIndicator();
        break;

      case "done":
        removeThinkingIndicator();
        finalizeAssistantBlock();
        setProcessing(false);
        break;

      case "error":
        removeThinkingIndicator();
        appendErrorMessage(msg.error || "Unknown error");
        break;

      case "taskLoaded":
        hideWelcome();
        if (msg.task) {
          appendTaskBanner(msg.task);
        }
        break;

      case "contextReset":
        messagesContainer.innerHTML = "";
        if (welcomeScreen) welcomeScreen.style.display = "flex";
        currentAssistantBlock = null;
        currentAssistantContent = "";
        appendSystemMessage("Context reset — starting fresh.");
        break;

      case "newSession":
        messagesContainer.innerHTML = "";
        if (welcomeScreen) welcomeScreen.style.display = "flex";
        currentAssistantBlock = null;
        currentAssistantContent = "";
        appendSystemMessage(
          "New session started" +
            (msg.sessionId ? ` (${msg.sessionId})` : "") +
            "."
        );
        break;

      case "restoreHistory":
        if (msg.messages && Array.isArray(msg.messages)) {
          hideWelcome();
          for (const m of msg.messages) {
            if (m.role === "user") {
              appendUserMessage(m.content);
            } else if (m.role === "assistant") {
              const block = appendAssistantBlock();
              const contentEl = block.querySelector(".message-content");
              if (contentEl) contentEl.innerHTML = renderMarkdown(m.content);
            }
          }
        }
        break;
    }
  });

  // Notify extension that webview is ready
  vscode.postMessage({ type: "ready" });
})();
