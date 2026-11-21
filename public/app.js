
const $ = (id) => document.getElementById(id);

const messagesEl = $("messages");
const welcomeEl = $("welcome");
const promptEl = $("prompt");

let chats = JSON.parse(localStorage.getItem("darkia_chats") || "[]");
let activeId = null;
let busy = false;

// ======================================
// HISTORIAL
// ======================================

function save() {
  localStorage.setItem("darkia_chats", JSON.stringify(chats));
}

function current() {
  return chats.find(c => c.id === activeId);
}

function newChat() {
  const chat = {
    id: crypto.randomUUID(),
    title: "Nuevo chat",
    messages: []
  };

  chats.unshift(chat);
  activeId = chat.id;
  save();
  renderAll();
  promptEl.focus();
}

function renderList() {
  $("chatList").innerHTML = "";

  chats.forEach(chat => {
    const el = document.createElement("div");

    el.className = "chat-item" +
      (chat.id === activeId ? " active" : "");

    el.textContent = chat.title;
    el.title = chat.title;

    el.onclick = () => {
      activeId = chat.id;
      renderAll();
      $("sidebar").classList.remove("open");
    };

    $("chatList").append(el);
  });
}

// ======================================
// SEGURIDAD Y FORMATO DE TEXTO
// ======================================

function safeText(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPlainText(text) {
  let out = safeText(text);

  out = out.replace(
    /`([^`\n]+)`/g,
    "<code>$1</code>"
  );

  return out.replace(/\n/g, "<br>");
}

// ======================================
// INFORMACIÓN DE ARCHIVOS
// ======================================

const fileTypes = {
  html: { name: "HTML", file: "index.html" },
  css: { name: "CSS", file: "styles.css" },
  javascript: { name: "JavaScript", file: "app.js" },
  js: { name: "JavaScript", file: "app.js" },
  python: { name: "Python", file: "main.py" },
  py: { name: "Python", file: "main.py" },
  json: { name: "JSON", file: "data.json" },
  php: { name: "PHP", file: "index.php" },
  java: { name: "Java", file: "Main.java" },
  xml: { name: "XML", file: "document.xml" },
  sql: { name: "SQL", file: "database.sql" },
  bash: { name: "Bash", file: "script.sh" },
  sh: { name: "Shell", file: "script.sh" },
  typescript: { name: "TypeScript", file: "app.ts" },
  ts: { name: "TypeScript", file: "app.ts" },
  jsx: { name: "React JSX", file: "App.jsx" },
  tsx: { name: "React TSX", file: "App.tsx" },
  c: { name: "C", file: "main.c" },
  cpp: { name: "C++", file: "main.cpp" },
  csharp: { name: "C#", file: "Main.cs" },
  cs: { name: "C#", file: "Main.cs" },
  go: { name: "Go", file: "main.go" },
  rust: { name: "Rust", file: "main.rs" },
  ruby: { name: "Ruby", file: "main.rb" },
  yaml: { name: "YAML", file: "config.yaml" },
  yml: { name: "YAML", file: "config.yml" },
  markdown: { name: "Markdown", file: "README.md" },
  md: { name: "Markdown", file: "README.md" },
  plaintext: { name: "Texto", file: "document.txt" },
  text: { name: "Texto", file: "document.txt" }
};

function getFileInfo(info) {
  const parts = info.trim().split(/\s+/);

  const language = (parts[0] || "text").toLowerCase();

  const type = fileTypes[language] || {
    name: language.toUpperCase(),
    file: "codigo." + language
  };

  let filename = parts.find(part =>
    /^[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+$/.test(part)
  );

  if (!filename) filename = type.file;

  return {
    language,
    label: type.name,
    filename
  };
}

// ======================================
// TARJETA DE CÓDIGO
// ======================================

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    toast("Código completo copiado.");
  } catch {
    const area = document.createElement("textarea");

    area.value = code;
    document.body.append(area);
    area.select();

    try {
      document.execCommand("copy");
      toast("Código copiado.");
    } catch {
      toast("No se pudo copiar el código.");
    }

    area.remove();
  }
}

function downloadCode(code, filename) {
  const blob = new Blob(
    [code],
    { type: "text/plain;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  toast("Archivo descargado.");
}

function createCodeCard(info, code) {
  const card = document.createElement("section");
  card.className = "code-result-card";

  const lines = code.split("\n");
  const totalLines = lines.length;
  const previewLimit = 12;

  let expanded = false;

  // CABECERA
  const header = document.createElement("div");
  header.className = "code-result-header";

  const title = document.createElement("strong");
  title.textContent = info.filename;

  const status = document.createElement("span");
  status.className = "code-status success";
  status.textContent = "Terminado con éxito";

  header.append(title, status);

  // INFORMACIÓN DEL ARCHIVO
  const metadata = document.createElement("div");
  metadata.className = "code-result-meta";

  const language = document.createElement("span");
  language.textContent = info.label;

  const count = document.createElement("span");
  count.textContent = totalLines + " líneas";

  metadata.append(language, count);

  // VISTA DEL CÓDIGO
  const preview = document.createElement("pre");
  preview.className = "code-result-preview";

  const codeElement = document.createElement("code");
  codeElement.textContent = lines
    .slice(0, previewLimit)
    .join("\n");

  preview.append(codeElement);

  // BOTONES
  const actions = document.createElement("div");
  actions.className = "code-result-actions";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Copiar";
  copyButton.className = "code-copy-btn";

  copyButton.onclick = () => copyCode(code);

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.textContent = "Descargar";
  downloadButton.className = "code-download-btn";

  downloadButton.onclick = () =>
    downloadCode(code, info.filename);

  actions.append(copyButton, downloadButton);

  // VER MÁS
  const more = document.createElement("button");
  more.type = "button";
  more.className = "code-more-btn";

  function updatePreview() {
    const visibleLines = expanded
      ? lines
      : lines.slice(0, previewLimit);

    codeElement.textContent = visibleLines.join("\n");

    if (totalLines > previewLimit) {
      more.hidden = false;

      more.textContent = expanded
        ? "Ver menos"
        : `Ver más... (${totalLines - previewLimit} líneas más)`;
    } else {
      more.hidden = true;
    }
  }

  more.onclick = () => {
    expanded = !expanded;
    updatePreview();
  };

  updatePreview();

  card.append(
    header,
    metadata,
    preview,
    more,
    actions
  );

  return card;
}

// ======================================
// RESULTADO DE ERROR
// ======================================

function createErrorCard(message) {
  const card = document.createElement("div");
  card.className = "code-result-card code-error-card";

  const status = document.createElement("strong");
  status.className = "code-status error";
  status.textContent = "Error";

  const description = document.createElement("p");
  description.textContent = message;

  card.append(status, description);

  return card;
}

// ======================================
// PROCESAR RESPUESTAS DE LA IA
// ======================================

function renderAssistantContent(container, message) {
  if (message.error) {
    container.append(
      createErrorCard(message.content)
    );
    return;
  }

  const text = String(message.content || "");

  const regex = /```([^\n`]*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);

    if (before.trim()) {
      const paragraph = document.createElement("div");
      paragraph.className = "assistant-text";
      paragraph.innerHTML = formatPlainText(before);
      container.append(paragraph);
    }

    const info = getFileInfo(match[1]);
    const code = match[2].replace(/\n$/, "");

    container.append(
      createCodeCard(info, code)
    );

    lastIndex = regex.lastIndex;
  }

  const remaining = text.slice(lastIndex);

  if (remaining.trim()) {
    const paragraph = document.createElement("div");
    paragraph.className = "assistant-text";
    paragraph.innerHTML = formatPlainText(remaining);
    container.append(paragraph);
  }
}

// ======================================
// MENSAJES
// ======================================

function renderMessages() {
  const chat = current();
  const list = chat?.messages || [];

  welcomeEl.hidden = list.length > 0;
  messagesEl.innerHTML = "";

  list.forEach(message => {
    const row = document.createElement("div");

    row.className = "message " + message.role;

    if (message.role === "assistant") {
      const who = document.createElement("div");

      who.className = "who";
      who.textContent = "D";

      row.append(who);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (message.role === "assistant") {
      renderAssistantContent(bubble, message);
    } else {
      bubble.textContent = message.content;
    }

    row.append(bubble);
    messagesEl.append(row);
  });

  if (busy) {
    const row = document.createElement("div");
    row.className = "message assistant";

    const who = document.createElement("div");
    who.className = "who";
    who.textContent = "D";

    const bubble = document.createElement("div");
    bubble.className = "bubble typing";
    bubble.textContent = "DARK IA está pensando…";

    row.append(who, bubble);
    messagesEl.append(row);
  }

  $("conversation").scrollTop =
    $("conversation").scrollHeight;
}

function renderAll() {
  renderList();
  renderMessages();
}

// ======================================
// NOTIFICACIONES
// ======================================

function toast(message) {
  const el = $("toast");

  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 2600);
}

// ======================================
// CONEXIÓN CON DARK IA
// ======================================

async function send(text) {
  const content = text.trim();

  if (!content || busy) return;

  if (!current()) newChat();

  const chat = current();

  chat.messages.push({
    role: "user",
    content
  });

  if (chat.title === "Nuevo chat") {
    chat.title =
      content.slice(0, 34) +
      (content.length > 34 ? "…" : "");
  }

  promptEl.value = "";
  promptEl.style.height = "auto";

  busy = true;

  save();
  renderAll();
  renderList();

  $("sendBtn").disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        messages: chat.messages.slice(-30)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Error al consultar la IA."
      );
    }

    if (typeof data.answer !== "string") {
      throw new Error("La respuesta de la IA no es válida.");
    }

    chat.messages.push({
      role: "assistant",
      content: data.answer
    });

  } catch (err) {
    chat.messages.push({
      role: "assistant",
      content: "No pude completar la solicitud: " + err.message,
      error: true
    });

  } finally {
    busy = false;

    $("sendBtn").disabled = false;

    save();
    renderAll();
    renderList();

    promptEl.focus();
  }
}

// ======================================
// EVENTOS
// ======================================

$("chatForm").addEventListener("submit", event => {
  event.preventDefault();
  send(promptEl.value);
});

promptEl.addEventListener("input", () => {
  promptEl.style.height = "auto";

  promptEl.style.height =
    Math.min(promptEl.scrollHeight, 180) + "px";
});

promptEl.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("chatForm").requestSubmit();
  }
});

$("newChat").onclick = newChat;

$("clearBtn").onclick = () => {
  if (!current()) return;

  current().messages = [];
  current().title = "Nuevo chat";

  save();
  renderAll();
  renderList();

  toast("Conversación borrada.");
};

$("menuBtn").onclick = () => {
  $("sidebar").classList.toggle("open");
};

document.querySelectorAll(".suggestion").forEach(button => {
  button.onclick = () => send(button.dataset.prompt);
});

// ======================================
// INICIO
// ======================================

if (chats.length) {
  activeId = chats[0].id;
} else {
  newChat();
}

renderAll();
         
