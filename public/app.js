const $ = id => document.getElementById(id);

// ======================================
// DARK IA 1.0 - CONFIGURACIÓN
// ======================================

let STORAGE_PROJECT = "";
let STORAGE_PROJECT_HISTORY = "";
let STORAGE_MODEL = "";
let STORAGE_MODE = "";
let STORAGE_PREFERENCES = "";
let STORAGE_CHATS = "";

const messagesEl = $("messages");
const welcomeEl = $("welcome");
const promptEl = $("prompt");

let chats = [];
let activeId = null;
let busy = false;
let activeController = null;
let freeModelIds = new Set(["openrouter/free"]);
let settings = { personality: "professional", emojiLevel: "low" };

let projectFiles = [];
let projectHistory = [];
let activeFileId = null;

function setGuestStorage(deviceId) {
  const prefix = `darkia_v1_guest_${deviceId}`;
  STORAGE_PROJECT = `${prefix}_studio`;
  STORAGE_PROJECT_HISTORY = `${prefix}_studio_history`;
  STORAGE_MODEL = `${prefix}_model`;
  STORAGE_MODE = `${prefix}_mode`;
  STORAGE_PREFERENCES = `${prefix}_preferences`;
  STORAGE_CHATS = `${prefix}_chats`;

  projectFiles = loadJSON(STORAGE_PROJECT, []);
  projectHistory = loadJSON(STORAGE_PROJECT_HISTORY, []);
  if (!Array.isArray(projectFiles)) projectFiles = [];
  projectFiles = projectFiles.filter(file => file && typeof file.id === "string" && typeof file.name === "string" && typeof file.content === "string");
  if (!Array.isArray(projectHistory)) projectHistory = [];
  projectHistory = projectHistory
    .filter(snapshot => snapshot && typeof snapshot.id === "string" && typeof snapshot.savedAt === "string" && Array.isArray(snapshot.files))
    .map(snapshot => ({
      ...snapshot,
      files: snapshot.files.filter(file => file && typeof file.id === "string" && typeof file.name === "string" && typeof file.content === "string")
    }));
}

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
  try {
    localStorage.setItem(STORAGE_CHATS, JSON.stringify(chats.slice(0, 200)));
  } catch (error) {
    console.error("No se pudo guardar el historial local:", error);
    toast("No se pudo guardar el historial en este navegador. Libera espacio o borra chats.");
  }
}

function saveProject() {
  try {
    localStorage.setItem(STORAGE_PROJECT, JSON.stringify(projectFiles));
    return true;
  } catch (error) {
    console.error("No se pudo guardar el proyecto local:", error);
    toast("No hay espacio para guardar el proyecto en este dispositivo.");
    return false;
  }
}

function saveProjectSnapshot() {
  const serialized = JSON.stringify(projectFiles);
  if (JSON.stringify(projectHistory[0]?.files || []) === serialized) return false;

  const previousHistory = projectHistory;
  projectHistory.unshift({
    id: makeId(),
    savedAt: new Date().toISOString(),
    files: JSON.parse(serialized)
  });
  projectHistory = projectHistory.slice(0, 3);

  try {
    localStorage.setItem(STORAGE_PROJECT_HISTORY, JSON.stringify(projectHistory));
    return true;
  } catch (error) {
    projectHistory = previousHistory;
    console.error("No se pudo guardar la instantánea local:", error);
    toast("No hay espacio para guardar el historial de versiones.");
    return false;
  }
}

function current() {
  return chats.find(c => c.id === activeId);
}

function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : (() => {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0"));
        return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
      })();
}

// ======================================
// HISTORIAL
// ======================================

function newChat() {
  const chat = {
    id: makeId(),
    title: "Nuevo chat",
    messages: [],
    model: $("modelSelect")?.value || "openrouter/free",
    mode: $("modeSelect")?.value || "general"
  };

  chats.unshift(chat);
  activeId = chat.id;

  save(chat);
  renderAll();
}

function renderList() {
  const list = $("chatList");
  if (!list) return;

  list.innerHTML = "";
  const query = $("searchChats")?.value.trim().toLocaleLowerCase() || "";

  chats.filter(chat => !query || chat.title.toLocaleLowerCase().includes(query)).forEach(chat => {
    const el = document.createElement("div");

    el.className =
      "chat-item" +
      (chat.id === activeId ? " active" : "");

    el.title = chat.title;

    const title = document.createElement("button");
    title.type = "button";
    title.className = "chat-title";
    title.textContent = chat.title;
    title.onclick = () => {
      activeId = chat.id;
      if (freeModelIds.has(chat.model)) $("modelSelect").value = chat.model;
      renderAll();
      $("sidebar").classList.remove("open");
    };

    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "chat-action";
    rename.textContent = "✎";
    rename.title = "Renombrar conversación";
    rename.setAttribute("aria-label", `Renombrar ${chat.title}`);
    rename.onclick = () => {
      const nextTitle = prompt("Nuevo nombre para esta conversación:", chat.title);
      if (!nextTitle?.trim()) return;
      chat.title = nextTitle.trim().slice(0, 80);
      save(chat);
      renderList();
    };

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "chat-action";
    remove.textContent = "×";
    remove.title = "Eliminar conversación";
    remove.setAttribute("aria-label", `Eliminar ${chat.title}`);
    remove.onclick = () => {
      if (!confirm(`¿Eliminar «${chat.title}»? Esta acción no se puede deshacer.`)) return;
      chats = chats.filter(item => item.id !== chat.id);
      if (activeId === chat.id) activeId = chats[0]?.id || null;
      save(chats[0] || { id: "local-only" });
      renderAll();
    };

    el.append(title, rename, remove);
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

  out = out.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  out = out.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  out = out.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/^\s*[-*]\s+(.+)$/gm, "• $1");

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
    toast("Texto copiado al portapapeles.");
  } catch {
    const area = document.createElement("textarea");
    area.value = code;
    document.body.append(area);
    area.select();

    try {
      document.execCommand("copy");
      toast("Texto copiado al portapapeles.");
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

function createErrorCard(message, onRetry) {
  const card = document.createElement("div");
  card.className = "code-result-card code-error-card";

  const status = document.createElement("strong");
  status.className = "code-status error";
  status.textContent = "Error";

  const description = document.createElement("p");
  description.textContent = message;

  card.append(status, description);

  if (onRetry) {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "code-more-btn";
    retry.textContent = "Reintentar respuesta";
    retry.onclick = onRetry;
    card.append(retry);
  }

  return card;
}

// ======================================
// PROCESAR RESPUESTAS
// ======================================

function renderAssistantContent(container, message, onRetry) {
  if (message.error) {
    container.append(createErrorCard(message.content, onRetry));
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

  if (text.trim()) {
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "copy-answer";
    copyButton.textContent = "Copiar respuesta";
    copyButton.onclick = () => copyCode(text);
    container.append(copyButton);
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

  list.forEach((message, messageIndex) => {
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
      renderAssistantContent(bubble, message, () => retryResponse(messageIndex));
    } else {
      bubble.textContent = message.content;
    }

    row.append(bubble);

    if (message.role === "assistant" && message.model) {
      const modelMeta = document.createElement("div");
      modelMeta.className = "model-meta";
      modelMeta.textContent = "Modelo usado: ";
      const modelName = document.createElement("strong");
      modelName.textContent = message.model;
      modelMeta.append(modelName);
      row.append(modelMeta);
    }

    if (message.role === "assistant" && Array.isArray(message.sources) && message.sources.length) {
      const references = document.createElement("div");
      references.className = "source-citations";
      message.sources.forEach(source => {
        try {
          const url = new URL(source.url);
          if (url.protocol !== "https:" || !["github.com", "stackoverflow.com"].includes(url.hostname)) return;
          const link = document.createElement("a");
          link.href = url.toString();
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          const provider = document.createElement("span");
          provider.textContent = source.provider;
          const title = document.createElement("strong");
          title.textContent = source.title;
          const snippet = document.createElement("small");
          snippet.textContent = source.snippet || "";
          link.append(provider, title, snippet);
          references.append(link);
        } catch {}
      });
      if (references.childElementCount) row.append(references);
    }

    if (message.role === "assistant" && message.sourceAvailability &&
        (!message.sourceAvailability.github || !message.sourceAvailability.stackoverflow || !message.sources?.length)) {
      const sourceStatus = document.createElement("small");
      sourceStatus.className = "source-status";
      const unavailable = [];
      if (!message.sourceAvailability.github) unavailable.push("GitHub");
      if (!message.sourceAvailability.stackoverflow) unavailable.push("Stack Overflow");
      sourceStatus.textContent = unavailable.length
        ? `Fuente temporalmente no disponible: ${unavailable.join(", ")}.`
        : "La búsqueda no devolvió resultados enlazables.";
      if (sourceStatus.textContent) row.append(sourceStatus);
    }

    if (message.role === "user") {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "edit-message";
      editButton.textContent = "Editar";
      editButton.setAttribute("aria-label", "Editar y reenviar este mensaje");
      editButton.onclick = async () => {
        const revised = prompt("Edita el mensaje y vuelve a enviarlo:", message.content);
        if (!revised?.trim() || busy) return;
        const activeChat = current();
        activeChat.messages = activeChat.messages.slice(0, messageIndex);
        save();
        renderAll();
        await send(revised);
      };
      row.append(editButton);
    }

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

$("projectCodeEditor").addEventListener("keydown", event => {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const editor = event.currentTarget;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.setRangeText("  ", start, end, "end");
  editor.dispatchEvent(new Event("input", { bubbles: true }));
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

const IMPORT_EXTENSIONS = new Set(["html", "htm", "css", "js", "mjs", "cjs", "ts", "tsx", "jsx", "py", "json", "md", "txt", "yaml", "yml", "sql", "java", "go", "rs"]);
const MAX_IMPORTED_FILE_BYTES = 100 * 1024;
const MAX_PROJECT_BYTES = 450 * 1024;
const MAX_PROJECT_FILES = 25;

async function importProjectFiles(fileList) {
  const selected = Array.from(fileList || []);
  if (!selected.length) return;

  const before = JSON.parse(JSON.stringify(projectFiles));
  let projectBytes = projectFiles.reduce((sum, file) => sum + new Blob([file.content]).size, 0);
  let imported = 0;

  for (const file of selected) {
    const filename = file.name;
    const extension = filename.split(".").pop().toLowerCase();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(filename) || !filename.includes(".") || !IMPORT_EXTENSIONS.has(extension)) {
      toast(`Archivo omitido por nombre o tipo no permitido: ${filename}`);
      continue;
    }
    if (file.size > MAX_IMPORTED_FILE_BYTES) {
      toast(`${filename} supera el límite de 100 KiB.`);
      continue;
    }

    const oldFile = projectFiles.find(entry => entry.name === filename);
    if (!oldFile && projectFiles.length >= MAX_PROJECT_FILES) {
      toast(`El proyecto admite hasta ${MAX_PROJECT_FILES} archivos.`);
      continue;
    }
    const sizeBefore = oldFile ? new Blob([oldFile.content]).size : 0;
    if (projectBytes - sizeBefore + file.size > MAX_PROJECT_BYTES) {
      toast("El proyecto supera el límite local de 450 KiB.");
      continue;
    }

    try {
      const content = await file.text();
      if (content.includes("\u0000")) {
        toast(`${filename} parece binario y se omitió.`);
        continue;
      }
      if (oldFile) {
        oldFile.content = content;
        activeFileId = oldFile.id;
      } else {
        const added = { id: makeId(), name: filename, content };
        projectFiles.push(added);
        activeFileId = added.id;
      }
      projectBytes = projectBytes - sizeBefore + new Blob([content]).size;
      imported += 1;
    } catch {
      toast(`No se pudo leer ${filename}.`);
    }
  }

  if (imported && !saveProject()) {
    projectFiles = before;
    activeFileId = projectFiles[0]?.id || null;
    renderProjectFiles();
    renderEditor();
    return;
  }
  if (imported) {
    renderProjectFiles();
    renderEditor();
    toast(`${imported} archivo(s) de texto importado(s).`);
  }
}

// ======================================
// GUARDAR PROYECTO
// ======================================

function saveProjectNow() {
  const file = activeProjectFile();

  if (file) {
    file.content = $("projectCodeEditor").value;
  }

  if (!saveProject()) return;
  saveProjectSnapshot();
  toast("Proyecto y versión guardados en este dispositivo.");
}

function renderProjectHistory() {
  const list = $("projectHistoryList");
  list.replaceChildren();
  if (!projectHistory.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "Aún no hay versiones. Usa Guardar para crear una instantánea.";
    list.append(empty);
    return;
  }

  projectHistory.forEach(snapshot => {
    const row = document.createElement("div");
    row.className = "history-entry";
    const details = document.createElement("span");
    const date = new Date(snapshot.savedAt);
    details.textContent = `${date.toLocaleString()} · ${snapshot.files.length} archivo(s)`;
    const restore = document.createElement("button");
    restore.type = "button";
    restore.className = "project-action";
    restore.textContent = "Restaurar";
    restore.onclick = () => restoreProjectSnapshot(snapshot.id);
    row.append(details, restore);
    list.append(row);
  });
}

function openProjectHistory() {
  renderProjectHistory();
  const dialog = $("projectHistoryDialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function restoreProjectSnapshot(id) {
  const snapshot = projectHistory.find(item => item.id === id);
  if (!snapshot || !Array.isArray(snapshot.files)) return;
  if (!confirm("¿Restaurar esta versión? El proyecto actual será reemplazado en este navegador.")) return;
  const restoredFiles = JSON.parse(JSON.stringify(snapshot.files));
  const restoredBytes = restoredFiles.reduce((sum, file) => sum + new Blob([file.content]).size, 0);
  if (restoredFiles.length > MAX_PROJECT_FILES || restoredBytes > MAX_PROJECT_BYTES || restoredFiles.some(file => !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}\.[a-zA-Z0-9]+$/.test(file.name))) {
    toast("La versión almacenada no cumple los límites de seguridad del proyecto.");
    return;
  }
  projectFiles = restoredFiles;
  activeFileId = projectFiles[0]?.id || null;
  if (!saveProject()) return;
  renderProjectFiles();
  renderEditor();
  $("projectHistoryDialog").close?.();
  toast("Versión restaurada.");
}

async function validateActiveProjectFile() {
  const file = activeProjectFile();
  if (!file) {
    toast("Selecciona un archivo para validar.");
    return;
  }
  const extension = file.name.split(".").pop().toLowerCase();
  if (!["js", "mjs", "cjs", "ts", "tsx", "jsx", "json"].includes(extension)) {
    toast("La validación local solo admite JS, TS, JSX, TSX y JSON.");
    return;
  }

  try {
    const response = await fetch("/api/code/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: extension, code: file.content })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || "Falló la validación.");
    if (data.valid) {
      toast(`${file.name}: sintaxis correcta (no es un type-check ni ejecuta código).`);
      return;
    }
    const details = data.diagnostics.slice(0, 8).map(item => {
      const location = item.line ? `Línea ${item.line}${item.column ? `, columna ${item.column}` : ""}: ` : "";
      return `• ${location}${item.message}`;
    }).join("\n");
    alert(`${file.name}: se encontraron errores de sintaxis.\n\n${details}`);
  } catch (error) {
    toast(error.message || "No se pudo validar el archivo.");
  }
}

const ASSIST_TASKS = {
  debug: "Depura el archivo/proyecto compartido. Encuentra primero la causa raíz; diferencia errores demostrables de hipótesis y propone el parche mínimo.",
  explain: "Explica el código compartido por bloques: propósito, flujo de datos, dependencias y posibles casos límite. Adapta el nivel a alguien que aprende.",
  review: "Haz una revisión de seguridad defensiva del código compartido. Prioriza hallazgos por severidad, cita archivo y fragmento/ubicación, explica impacto y mitigación; no inventes problemas.",
  tests: "Propón y escribe pruebas para el código compartido: casos normales, límites y errores. Indica framework solo si puede inferirse; si no, presenta una opción explícita sin afirmar que se ejecutó."
};

async function askAboutProject(action) {
  if (busy) return;
  const task = ASSIST_TASKS[action];
  if (!task) return;
  const active = activeProjectFile();
  if (!projectFiles.length || !active) {
    toast("Agrega o selecciona archivos antes de pedir ayuda.");
    return;
  }

  const orderedFiles = [active, ...projectFiles.filter(file => file.id !== active.id)];
  const intro = `${task}\n\nContexto: archivos que seleccionaste compartir desde DARK IA Studio. Analiza solo el contenido incluido. No ejecutes el código ni afirmes haber probado lo que no se ha ejecutado.\n`;
  const contextLimit = 10_500 - intro.length;
  let used = 0;
  const sections = [];
  let omitted = 0;

  for (const file of orderedFiles) {
    const header = `\n\n--- ${file.name} ---\n`;
    const available = contextLimit - used - header.length;
    if (available <= 0) { omitted += 1; continue; }
    const excerpt = file.content.slice(0, available);
    sections.push(header + excerpt + (excerpt.length < file.content.length ? "\n[contenido truncado por límite de contexto]" : ""));
    used += header.length + excerpt.length;
    if (excerpt.length < file.content.length) omitted += 1;
  }

  if (omitted) sections.push(`\n\n[Se omitieron o truncaron ${omitted} archivo(s) por el límite de contexto.]`);
  const prompt = intro + sections.join("");
  $("modeSelect").value = "coding";
  try { localStorage.setItem(STORAGE_MODE, "coding"); } catch {}
  closeProjects();
  await send(prompt, { modeOverride: "coding" });
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

  const previewPolicy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'">`;
  const headMatch = /<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html);
  const safeBody = html
    .replace(/<!doctype\b[^>]*>/ig, "")
    .replace(/<html\b[^>]*>/ig, "")
    .replace(/<\/html\s*>/ig, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/ig, "")
    .replace(/<head\b[^>]*>/ig, "")
    .replace(/<body\b[^>]*>/ig, "")
    .replace(/<\/body\s*>/ig, "");
  // Rebuild a controlled outer document. Even markup illegally placed before <head>
  // is now inside the body, after the policy, rather than running before CSP.
  html = `<!doctype html><html><head>${previewPolicy}${headMatch?.[1] || ""}</head><body>${safeBody}</body></html>`;

  $("projectPreviewFrame").srcdoc = html;

  toast("Vista previa aislada; las API y recursos externos están bloqueados.");
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

function buildRequestHistory(messages) {
  let remaining = 22_000;
  const selected = [];
  for (const message of messages.slice(-30).reverse()) {
    if (message.content.length > remaining) break;
    selected.push({ role: message.role, content: message.content });
    remaining -= message.content.length;
  }
  return selected.reverse();
}

async function send(text, { appendUser = true, modeOverride = null } = {}) {
  const content = String(text || "").trim();
  if (!content || busy) return;
  if (!current()) newChat();
  const chat = current();
  const requestMode = modeOverride || $("modeSelect").value || chat.mode || "general";
  if (!freeModelIds.has(chat.model)) {
    toast("Este modelo ya no está disponible gratis. Elige una opción disponible para abrir un chat nuevo.");
    return;
  }
  chat.mode = requestMode;
  if (appendUser) {
    chat.messages.push({
      role: "user",
      content,
      mode: requestMode
    });
  }

  if (chat.title === "Nuevo chat") {
    chat.title =
      content.slice(0, 34) +
      (content.length > 34 ? "…" : "");
  }
  promptEl.value = "";
  promptEl.style.height = "auto";
  busy = true;
  activeController = new AbortController();
  save(chat);
  renderAll();
  $("sendBtn").disabled = true;
  $("stopBtn").hidden = false;
  $("modelSelect").disabled = true;
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: buildRequestHistory(chat.messages),
        model: chat.model,
        mode: requestMode,
        personality: settings.personality,
        emojiLevel: settings.emojiLevel,
        useSources: $("useSources").checked
      }),
      signal: activeController.signal
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al consultar la IA.");
    if (typeof data.answer !== "string") throw new Error("La respuesta de la IA no es válida.");
    chat.messages.push({
      role: "assistant",
      content: data.answer,
      model: data.model,
      selectedModel: data.selectedModel,
      sources: Array.isArray(data.sources) ? data.sources : [],
      sourceAvailability: data.sourceAvailability || null
    });
  } catch (err) {
    chat.messages.push({
      role: "assistant",
      content: err.name === "AbortError"
        ? "Generación detenida. El mensaje enviado se conserva en el historial."
        : "No pude completar la solicitud: " + err.message,
      error: err.name !== "AbortError"
    });
  } finally {
    busy = false;
    activeController = null;
    $("sendBtn").disabled = false;
    $("stopBtn").hidden = true;
    $("modelSelect").disabled = false;
    save(chat);
    renderAll();
  }
}

async function retryResponse(errorIndex) {
  const chat = current();
  if (busy || !chat || !chat.messages[errorIndex]?.error) return;

  const previousUser = chat.messages
    .slice(0, errorIndex)
    .reverse()
    .find(message => message.role === "user");
  if (!previousUser) return;

  const prompt = previousUser.content;
  chat.messages = chat.messages.slice(0, errorIndex);
  save();
  renderAll();
  await send(prompt, { appendUser: false, modeOverride: previousUser.mode || $("modeSelect").value });
}

async function loadModels() {
  const select = $("modelSelect");
  if (!select) return;
  try {
    const response = await fetch("/api/models");
    if (!response.ok) throw new Error("No se pudo cargar el catálogo de modelos.");
    const data = await response.json();
    if (!Array.isArray(data.models) || !data.models.length) return;
    const savedModel = localStorage.getItem(STORAGE_MODEL);
    freeModelIds = new Set(data.models.map(model => model.id));
    select.replaceChildren();
    data.models.forEach(model => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      select.append(option);
    });
    const activeModel = current()?.model;
    const activeExists = data.models.some(model => model.id === activeModel);
    const savedExists = data.models.some(model => model.id === savedModel);
    select.value = activeExists ? activeModel : savedExists ? savedModel : data.defaultModel;
    if (current() && !activeExists) newChat();
    if (!current()) newChat();
    select.addEventListener("change", () => {
      try { localStorage.setItem(STORAGE_MODEL, select.value); }
      catch (error) { console.warn("No se pudo guardar el modelo seleccionado:", error); }
      const active = current();
      if (active?.model !== select.value) {
        if (active) save(active);
        newChat();
        toast(`Nuevo chat con ${select.selectedOptions[0]?.textContent || select.value}.`);
      }
    });
  } catch (error) {
    console.warn("El selector de modelos usa la opción predeterminada:", error);
  }
}

function initializeModePicker() {
  const select = $("modeSelect");
  if (!select) return;
  const savedMode = localStorage.getItem(STORAGE_MODE);
  if (["general", "coding", "knowledge", "gaming"].includes(savedMode)) {
    select.value = savedMode;
  }
  select.addEventListener("change", () => {
    try { localStorage.setItem(STORAGE_MODE, select.value); }
    catch (error) { console.warn("No se pudo guardar el modo seleccionado:", error); }
    if (current()) {
      current().mode = select.value;
      save(current());
    }
  });
}

// ======================================
// EVENTOS DEL CHAT
// ======================================

function getGuestDeviceId() {
  const key = "darkia_v1_guest_device_id";
  try {
    const existing = localStorage.getItem(key);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing;
    const created = makeId();
    localStorage.setItem(key, created);
    return created;
  } catch {
    return `temporary-${makeId()}`;
  }
}

async function initializeApplication() {
  try {
    setGuestStorage(getGuestDeviceId());
    const storedChats = loadJSON(STORAGE_CHATS, []);
    chats = Array.isArray(storedChats)
      ? storedChats.filter(chat => chat && typeof chat.id === "string" && Array.isArray(chat.messages)).slice(0, 200)
      : [];
    activeId = chats[0]?.id || null;
    const stored = loadJSON(STORAGE_PREFERENCES, {});
    const personalities = ["professional", "cheerful", "direct", "friendly", "creative", "teacher"];
    const emojiLevels = ["none", "low", "medium", "always"];
    settings = {
      personality: personalities.includes(stored.personality) ? stored.personality : "professional",
      emojiLevel: emojiLevels.includes(stored.emojiLevel) ? stored.emojiLevel : "low",
      useSources: Boolean(stored.useSources)
    };
    $("personalitySelect").value = settings.personality;
    $("emojiLevelSelect").value = settings.emojiLevel;
    $("useSources").checked = settings.useSources;
    $("userName").textContent = "Invitado";
    $("userEmail").textContent = "Solo este navegador";
    $("userAvatar").textContent = "I";

    initializeModePicker();
    await loadModels();
    if (projectFiles.length) activeFileId = projectFiles[0].id;
    renderAll();
  } catch (error) {
    console.error("No se pudo iniciar el modo invitado:", error);
    toast("No se pudo preparar el historial local; puedes seguir usando DARK IA sin guardarlo.");
    initializeModePicker();
    await loadModels();
    renderAll();
  }
}

function openPreferences() {
  $("personalitySelect").value = settings.personality;
  $("emojiLevelSelect").value = settings.emojiLevel;
  const dialog = $("preferencesDialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function persistPreferences() {
  const personality = $("personalitySelect").value;
  const emojiLevel = $("emojiLevelSelect").value;
  if (!["professional", "cheerful", "direct", "friendly", "creative", "teacher"].includes(personality) ||
      !["none", "low", "medium", "always"].includes(emojiLevel)) {
    toast("Selecciona opciones válidas.");
    return;
  }
  settings = { ...settings, personality, emojiLevel };
  try { localStorage.setItem(STORAGE_PREFERENCES, JSON.stringify(settings)); }
  catch { toast("No se pudieron guardar los ajustes en este dispositivo."); return; }
  $("preferencesDialog").close?.();
  toast("Preferencias guardadas en este navegador.");
}

$("openSettings").addEventListener("click", openPreferences);
$("mobileSettings").addEventListener("click", openPreferences);
$("closePreferences").addEventListener("click", () => $("preferencesDialog").close?.());
$("savePreferences").addEventListener("click", persistPreferences);
$("useSources").addEventListener("change", () => {
  settings.useSources = $("useSources").checked;
  if (STORAGE_PREFERENCES) {
    try { localStorage.setItem(STORAGE_PREFERENCES, JSON.stringify(settings)); }
    catch { toast("No se pudo guardar esta preferencia."); }
  }
});
$("clearGuestChatsBtn").addEventListener("click", () => {
  if (!confirm("¿Borrar todos los chats guardados en este navegador? No podrás recuperarlos.")) return;
  chats = [];
  activeId = null;
  save({ id: "local-only" });
  renderAll();
  toast("Se borró el historial de este navegador.");
});

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

$("searchChats").addEventListener("input", renderList);

$("stopBtn").addEventListener("click", () => {
  activeController?.abort();
});

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
$("projectFileUpload").addEventListener("change", async event => {
  await importProjectFiles(event.currentTarget.files);
  event.currentTarget.value = "";
});
$("validateProject").onclick = validateActiveProjectFile;
$("historyProject").onclick = openProjectHistory;
$("closeProjectHistory").onclick = () => $("projectHistoryDialog").close?.();
document.querySelectorAll("[data-assist]").forEach(button => {
  button.addEventListener("click", () => askAboutProject(button.dataset.assist));
});
$("saveProject").onclick = saveProjectNow;
$("previewProject").onclick = buildPreview;
$("refreshPreview").onclick = refreshPreview;

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    send(button.dataset.prompt || "");
  });
});

// Abrir el chat y el Studio únicamente tras validar la sesión en el servidor.
initializeApplication();
  
