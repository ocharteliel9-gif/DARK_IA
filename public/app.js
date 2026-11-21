const $ = id => document.getElementById(id);

// ======================================
// DARK IA 3.0 - CONFIGURACIÓN
// ======================================

const STORAGE_CHATS = "darkia_chats";
const STORAGE_PROJECT = "darkia_project_3";

const messagesEl = $("messages");
const welcomeEl = $("welcome");
const promptEl = $("prompt");

let chats = loadJSON(STORAGE_CHATS, []);
let activeId = null;
let busy = false;

let projectFiles = loadJSON(STORAGE_PROJECT, []);
let activeFileId = null;

// ======================================
// ALMACENAMIENTO
// ======================================

function loadJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function save() {
  localStorage.setItem(STORAGE_CHATS, JSON.stringify(chats));
}

function saveProject() {
  localStorage.setItem(
    STORAGE_PROJECT,
    JSON.stringify(projectFiles)
  );
}

function current() {
  return chats.find(c => c.id === activeId);
}

function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now() + "-" + Math.random().toString(36).slice(2);
}

// ======================================
// HISTORIAL
// ======================================

function newChat() {
  const chat = {
    id: makeId(),
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
  const list = $("chatList");
  if (!list) return;

  list.innerHTML = "";

  chats.forEach(chat => {
    const el = document.createElement("div");

    el.className =
      "chat-item" +
      (chat.id === activeId ? " active" : "");

    el.textContent = chat.title;
    el.title = chat.title;

    el.onclick = () => {
      activeId = chat.id;
      renderAll();
      $("sidebar").classList.remove("open");
    };

    list.append(el);
  });
}

// ======================================
// FORMATO SEGURO
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
// TIPOS DE ARCHIVOS
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

  const filename = parts.find(part =>
    /^[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+$/.test(part)
  ) || type.file;

  return {
    language,
    label: type.name,
    filename
  };
}

function languageFromFilename(filename) {
  const ext = filename.split(".").pop().toLowerCase();

  const aliases = {
    htm: "html",
    js: "javascript",
    ts: "typescript",
    py: "python",
    yml: "yaml",
    md: "markdown"
  };

  const language = aliases[ext] || ext;

  return fileTypes[language]?.name || language.toUpperCase();
}

// ======================================
// NOTIFICACIONES
// ======================================

function toast(message) {
  const el = $("toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 2600);
}

// ======================================
// COPIAR Y DESCARGAR
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

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  toast("Archivo descargado.");
}

// ======================================
// TARJETAS DE CÓDIGO
// ======================================

function createCodeCard(info, code) {
  const card = document.createElement("section");
  card.className = "code-result-card";

  const lines = code.split("\n");
  const totalLines = lines.length;
  const previewLimit = 12;

  let expanded = false;

  const header = document.createElement("div");
  header.className = "code-result-header";

  const title = document.createElement("strong");
  title.textContent = info.filename;

  const status = document.createElement("span");
  status.className = "code-status success";
  status.textContent = "Código generado";

  header.append(title, status);

  const metadata = document.createElement("div");
  metadata.className = "code-result-meta";

  const language = document.createElement("span");
  language.textContent = info.label;

  const count = document.createElement("span");
  count.textContent = totalLines + " líneas";

  metadata.append(language, count);

  const preview = document.createElement("pre");
  preview.className = "code-result-preview";

  const codeElement = document.createElement("code");
  preview.append(codeElement);

  const more = document.createElement("button");
  more.type = "button";
  more.className = "code-more-btn";

  function updatePreview() {
    codeElement.textContent = (
      expanded ? lines : lines.slice(0, previewLimit)
    ).join("\n");

    more.hidden = totalLines <= previewLimit;

    more.textContent = expanded
      ? "Ver menos"
      : `Ver más... (${totalLines - previewLimit} líneas más)`;
  }

  more.onclick = () => {
    expanded = !expanded;
    updatePreview();
  };

  updatePreview();

  const actions = document.createElement("div");
  actions.className = "code-result-actions";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "code-copy-btn";
  copyButton.textContent = "Copiar";
  copyButton.onclick = () => copyCode(code);

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.className = "code-download-btn";
  downloadButton.textContent = "Descargar";
  downloadButton.onclick = () =>
    downloadCode(code, info.filename);

  const studioButton = document.createElement("button");
  studioButton.type = "button";
  studioButton.className = "code-more-btn";
  studioButton.textContent = "＋ Agregar al Studio";

  studioButton.onclick = () => {
    addProjectFile(info.filename, code);
    openProjects();
    toast(info.filename + " agregado al Studio.");
  };

  actions.append(
    copyButton,
    downloadButton,
    studioButton
  );

  card.append(
    header,
    metadata,
    preview,
    more,
    actions
  );

  return card;
}

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
// PROCESAR RESPUESTAS
// ======================================

function renderAssistantContent(container, message) {
  if (message.error) {
    container.append(createErrorCard(message.content));
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

    container.append(createCodeCard(info, code));

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
// DARK IA STUDIO - ABRIR Y CERRAR
// ======================================

function openProjects() {
  $("sidebar").classList.remove("open");

  $("projectWorkspace").hidden = false;
  document.querySelector(".app").hidden = true;

  renderProjectFiles();
  renderEditor();
}

function closeProjects() {
  $("projectWorkspace").hidden = true;
  document.querySelector(".app").hidden = false;
}

// ======================================
// ARCHIVOS DEL PROYECTO
// ======================================

function addProjectFile(filename, content = "") {
  const existing = projectFiles.find(
    file => file.name === filename
  );

  if (existing) {
    existing.content = content;
    activeFileId = existing.id;
  } else {
    const file = {
      id: makeId(),
      name: filename,
      content: content
    };

    projectFiles.push(file);
    activeFileId = file.id;
  }

  saveProject();
  renderProjectFiles();
  renderEditor();
}

function activeProjectFile() {
  return projectFiles.find(
    file => file.id === activeFileId
  );
}

function renderProjectFiles() {
  const list = $("projectFileList");
  if (!list) return;

  list.innerHTML = "";

  if (!projectFiles.length) {
    const empty = document.createElement("div");
    empty.className = "empty-files";
    empty.textContent = "Todavía no hay archivos.";

    const small = document.createElement("small");
    small.textContent = "Genera un proyecto para comenzar.";

    empty.append(small);
    list.append(empty);
    return;
  }

  projectFiles.forEach(file => {
    const item = document.createElement("button");
    item.type = "button";

    item.className =
      "project-file-item" +
      (file.id === activeFileId ? " active" : "");

    const icon = document.createElement("span");
    icon.className = "file-icon";
    icon.textContent = file.name.endsWith(".html")
      ? "🌐"
      : file.name.endsWith(".css")
        ? "🎨"
        : file.name.endsWith(".js")
          ? "⚡"
          : "📄";

    const name = document.createElement("span");
    name.textContent = file.name;

    item.append(icon, name);

    item.onclick = () => {
      activeFileId = file.id;
      renderProjectFiles();
      renderEditor();
    };

    list.append(item);
  });
}

// ======================================
// EDITOR DE CÓDIGO
// ======================================

function renderEditor() {
  const file = activeProjectFile();
  const editor = $("projectCodeEditor");

  if (!file) {
    $("activeFileName").textContent = "Sin archivo seleccionado";
    $("editorLanguage").textContent = "EDITOR";
    editor.value = "";
    updateLineCount();
    return;
  }

  $("activeFileName").textContent = file.name;
  $("editorLanguage").textContent =
    languageFromFilename(file.name);

  editor.value = file.content;
  updateLineCount();
}

function updateLineCount() {
  const editor = $("projectCodeEditor");
  const lines = editor.value.split("\n").length;

  $("editorLineCount").textContent =
    lines + (lines === 1 ? " línea" : " líneas");
}

$("projectCodeEditor").addEventListener("input", () => {
  const file = activeProjectFile();

  if (!file) return;

  file.content = $("projectCodeEditor").value;

  saveProject();
  updateLineCount();
});

// ======================================
// CREAR ARCHIVO MANUALMENTE
// ======================================

function createManualFile() {
  const filename = prompt(
    "Nombre del archivo. Ejemplo: index.html"
  );

  if (!filename) return;

  const cleanName = filename.trim();

  if (
    !/^[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+$/.test(cleanName)
  ) {
    toast("Nombre de archivo no válido.");
    return;
  }

  if (projectFiles.some(file => file.name === cleanName)) {
    toast("Ese archivo ya existe.");
    return;
  }

  addProjectFile(cleanName, "");
  toast("Archivo creado.");
}

// ======================================
// GUARDAR PROYECTO
// ======================================

function saveProjectNow() {
  const file = activeProjectFile();

  if (file) {
    file.content = $("projectCodeEditor").value;
  }

  saveProject();
  toast("Proyecto guardado en este dispositivo.");
}

// ======================================
// VISTA PREVIA DEL PROYECTO
// ======================================

function buildPreview() {
  const htmlFile =
    projectFiles.find(file => file.name === "index.html") ||
    projectFiles.find(file => file.name.endsWith(".html"));

  if (!htmlFile) {
    toast("Necesitas un archivo HTML para la vista previa.");
    return;
  }

  const css = projectFiles
    .filter(file => file.name.endsWith(".css"))
    .map(file => file.content)
    .join("\n");

  const js = projectFiles
    .filter(file => file.name.endsWith(".js"))
    .map(file => file.content)
    .join("\n");

  let html = htmlFile.content;

  if (css) {
    const safeCSS = css.replace(/</g, "\\3C ");

    if (/<\/head>/i.test(html)) {
      html = html.replace(
        /<\/head>/i,
        `<style>${safeCSS}</style></head>`
      );
    } else {
      html = `<style>${safeCSS}</style>` + html;
    }
  }

  if (js) {
    // Evita que una etiqueta de cierre rompa el documento.
    const safeJS = js
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e");

    const script = `<script>${safeJS}<\/script>`;

    if (/<\/body>/i.test(html)) {
      html = html.replace(
        /<\/body>/i,
        script + "</body>"
      );
    } else {
      html += script;
    }
  }

  $("projectPreviewFrame").srcdoc = html;

  toast("Vista previa actualizada.");
}

function refreshPreview() {
  buildPreview();
}

// ======================================
// EXPORTAR ARCHIVOS
// ======================================

function downloadProjectFiles() {
  if (!projectFiles.length) {
    toast("No hay archivos para descargar.");
    return;
  }

  // Descarga individual de los archivos del proyecto.
  projectFiles.forEach((file, index) => {
    setTimeout(() => {
      downloadCode(file.content, file.name);
    }, index * 350);
  });
}

// ======================================
// CONEXIÓN CON OPENROUTER
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
  }
}

// ======================================
// EVENTOS DEL CHAT
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

  toast("Conversación borrada.");
};

$("menuBtn").onclick = () => {
  $("sidebar").classList.toggle("open");
};

$("openProjects").onclick = openProjects;
$("closeProjects").onclick = closeProjects;

$("addProjectFile").onclick = createManualFile;
$("saveProject").onclick = saveProjectNow;
$("previewProject").onclick = buildPreview;
$("refreshPreview").onclick = refreshPreview;

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    send(button.dataset.prompt || "");
  });
});

// Seleccionar el primer archivo del Studio si existe.
if (projectFiles.length > 0) {
  activeFileId = projectFiles[0].id;
}

// Inicializar la aplicación.
renderAll();
  
