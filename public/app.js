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
let streamRenderQueued = false;
let freeModelIds = new Set(["openrouter/free"]);
let modelCapabilities = new Map([["openrouter/free", { supportsVision: true, dynamicVisionRouting: true }]]);
let settings = { personality: "professional", emojiLevel: "low" };
let pendingPhoto = null;
let pendingPhotoObjectUrl = null;
let photoProcessing = false;
const photoObjectUrls = new Map();
const MAX_COMPRESSED_PHOTO_BYTES = 600 * 1024;
const MAX_SOURCE_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_PHOTO_PIXELS = 16_000_000;
const MAX_PHOTO_DIMENSION = 16_384;

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

function parsePhotoDimensions(bytes, mimeType) {
  if (!(bytes instanceof Uint8Array)) return null;
  let dimensions = null;

  if (mimeType === "image/png" && bytes.length >= 24 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value) &&
      String.fromCharCode(...bytes.subarray(12, 16)) === "IHDR") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    dimensions = { width: view.getUint32(16, false), height: view.getUint32(20, false) };
  } else if (mimeType === "image/jpeg" && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      while (bytes[offset] === 0xff) offset += 1;
      if (offset >= bytes.length) break;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
      if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
      if (startOfFrame.has(marker) && segmentLength >= 7) {
        dimensions = {
          height: (bytes[offset + 3] << 8) | bytes[offset + 4],
          width: (bytes[offset + 5] << 8) | bytes[offset + 6]
        };
        break;
      }
      offset += segmentLength;
    }
  } else if (mimeType === "image/webp" && bytes.length >= 20 &&
      String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const chunkType = String.fromCharCode(...bytes.subarray(offset, offset + 4));
      const chunkLength = bytes[offset + 4] + bytes[offset + 5] * 256 + bytes[offset + 6] * 65_536 + bytes[offset + 7] * 16_777_216;
      const dataOffset = offset + 8;
      if (dataOffset + chunkLength > bytes.length) break;
      if (chunkType === "VP8X" && chunkLength >= 10) {
        dimensions = {
          width: 1 + bytes[dataOffset + 4] + bytes[dataOffset + 5] * 256 + bytes[dataOffset + 6] * 65_536,
          height: 1 + bytes[dataOffset + 7] + bytes[dataOffset + 8] * 256 + bytes[dataOffset + 9] * 65_536
        };
        break;
      }
      if (chunkType === "VP8L" && chunkLength >= 5 && bytes[dataOffset] === 0x2f) {
        dimensions = {
          width: 1 + bytes[dataOffset + 1] + ((bytes[dataOffset + 2] & 0x3f) << 8),
          height: 1 + ((bytes[dataOffset + 2] & 0xc0) >> 6) + (bytes[dataOffset + 3] << 2) + ((bytes[dataOffset + 4] & 0x0f) << 10)
        };
        break;
      }
      if (chunkType === "VP8 " && chunkLength >= 10 && bytes[dataOffset + 3] === 0x9d &&
          bytes[dataOffset + 4] === 0x01 && bytes[dataOffset + 5] === 0x2a) {
        dimensions = {
          width: ((bytes[dataOffset + 6] | (bytes[dataOffset + 7] << 8)) & 0x3fff),
          height: ((bytes[dataOffset + 8] | (bytes[dataOffset + 9] << 8)) & 0x3fff)
        };
        break;
      }
      offset = dataOffset + chunkLength + (chunkLength & 1);
    }
  }

  if (!dimensions || dimensions.width < 1 || dimensions.height < 1 ||
      dimensions.width > MAX_PHOTO_DIMENSION || dimensions.height > MAX_PHOTO_DIMENSION ||
      dimensions.width * dimensions.height > MAX_PHOTO_PIXELS) return null;
  return dimensions;
}

async function inspectPhotoDimensions(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!parsePhotoDimensions(bytes, file.type)) {
    throw new Error("No se pudieron validar las dimensiones de la foto o supera 16 megapíxeles.");
  }
}

function isValidImageRef(reference) {
  return Boolean(reference && typeof reference.id === "string" && /^[0-9a-f-]{36}$/i.test(reference.id) &&
    ["image/jpeg", "image/png", "image/webp"].includes(reference.mimeType));
}

function photoSupportedBy(modelId = $("modelSelect")?.value) {
  return modelId === "openrouter/free" || modelCapabilities.get(modelId)?.supportsVision === true;
}

function updatePhotoControl() {
  const button = $("attachPhoto");
  if (!button) return;
  button.disabled = busy || photoProcessing || !photoSupportedBy();
  button.title = !photoSupportedBy()
    ? "Elige un modelo gratuito con visión para adjuntar fotos."
    : "Adjuntar una foto JPEG, PNG o WEBP";
}

function revokePhotoUrl(id) {
  const url = photoObjectUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  photoObjectUrls.delete(id);
}

function imageIdsIn(messages) {
  return (messages || []).map(message => message?.imageRef?.id).filter(id => typeof id === "string");
}

async function removeStoredImages(ids) {
  const uniqueIds = [...new Set(ids)];
  for (const id of uniqueIds) {
    revokePhotoUrl(id);
    try { await globalThis.DarkImageStore?.remove(id); }
    catch (error) { console.warn("No se pudo borrar una foto local:", error); }
  }
}

function closeSidebar(restoreFocus = false) {
  $("sidebar").classList.remove("open");
  $("sidebarBackdrop").hidden = true;
  $("menuBtn").setAttribute("aria-expanded", "false");
  $("menuBtn").setAttribute("aria-label", "Abrir menú");
  if (restoreFocus) $("menuBtn").focus();
}

function setSidebarOpen(open) {
  $("sidebar").classList.toggle("open", open);
  $("sidebarBackdrop").hidden = !open;
  $("menuBtn").setAttribute("aria-expanded", String(open));
  $("menuBtn").setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  if (open) $("newChat").focus();
}

function closeApps() {
  const dialog = $("appsDialog");
  if (dialog?.open) dialog.close();
  $("navApps")?.classList.remove("active");
}

function openApps() {
  closeSidebar();
  $("navChat")?.classList.remove("active");
  $("navApps")?.classList.add("active");
  const dialog = $("appsDialog");
  if (dialog && !dialog.open) dialog.showModal();
}

function renderAppSearchLinks(query) {
  const results = $("appSearchResults");
  results.replaceChildren();
  const encoded = encodeURIComponent(query.trim());
  const providers = [
    { name: "Google Play", detail: "Tienda oficial de Android", url: `https://play.google.com/store/search?q=${encoded}&c=apps`, safe: true },
    { name: "F-Droid", detail: "Catálogo de software libre", url: `https://search.f-droid.org/?q=${encoded}&lang=es`, safe: true },
    { name: "APKMirror", detail: "Repositorio de terceros · verifica firma y desarrollador", url: `https://www.apkmirror.com/?s=${encoded}`, safe: false },
    { name: "Búsqueda web", detail: "Busca el nombre en sitios web", url: `https://www.google.com/search?q=${encoded}`, safe: false }
  ];

  providers.forEach(provider => {
    const link = document.createElement("a");
    link.className = "app-result-link";
    link.href = provider.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const name = document.createElement("strong");
    name.textContent = provider.name;
    const detail = document.createElement("small");
    detail.textContent = provider.detail;
    const action = document.createElement("span");
    action.textContent = "Abrir ↗";
    link.append(name, detail, action);
    results.append(link);
  });
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
      closeSidebar();
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
      const removedImageIds = imageIdsIn(chat.messages);
      chats = chats.filter(item => item.id !== chat.id);
      void removeStoredImages(removedImageIds);
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
  const inline = value => safeText(value)
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  const blocks = [];
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  let paragraph = [];
  let listType = null;

  const closeList = () => {
    if (listType) blocks.push(`</${listType}>`);
    listType = null;
  };
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const listItem = /^\s*(?:[-*•]\s+)(.+)$/.exec(line);
    const orderedItem = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (listItem || orderedItem) {
      flushParagraph();
      const nextType = orderedItem ? "ol" : "ul";
      if (listType !== nextType) {
        closeList();
        blocks.push(`<${nextType}>`);
        listType = nextType;
      }
      blocks.push(`<li>${inline((orderedItem || listItem)[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line);
  }

  flushParagraph();
  closeList();
  return blocks.join("");
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

const CODE_KEYWORDS = "abstract as async await bool break byte case catch char class const continue default def delete do double else enum export extends false finally float fn for from func function if implements import in insert int interface into let long match mut new null of package pass private protected pub public return select self set short static str string struct super switch table this throw true try type typeof undefined update use var void where while";
const CODE_KEYWORD_SET = new Set(CODE_KEYWORDS.toLowerCase().split(/\s+/));
const CODE_TOKEN_PATTERN = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|<!--[\s\S]*?-->|\/\/[\n\s\S]*?(?=\n|$)|\/\*[\s\S]*?\*\/|<\/?[A-Za-z][\w:.-]*|\/?>|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\b(?:abstract|as|async|await|bool|break|byte|case|catch|char|class|const|continue|default|def|delete|do|double|else|enum|export|extends|false|finally|float|fn|for|from|func|function|if|implements|import|in|insert|int|interface|into|let|long|match|mut|new|null|of|package|pass|private|protected|pub|public|return|select|self|set|short|static|str|string|struct|super|switch|table|this|throw|true|try|type|typeof|undefined|update|use|var|void|where|while)\b|(?:===|!==|=>|==|!=|<=|>=|\+\+|&&|\|\||[{}()\[\].,;:+\/%!?=<>*~\-]))/i;

function highlightCodeLines(lines, language) {
  const code = lines.join("\n");
  const lang = String(language || "").toLowerCase();
  const hashComments = ["python", "py", "bash", "sh", "shell", "yaml", "yml", "ruby"].includes(lang);
  const sqlComments = lang === "sql";
  const tokenSource = CODE_TOKEN_PATTERN.source +
    (hashComments ? "|#[^\\n]*" : "") +
    (sqlComments ? "|--[^\\n]*" : "");
  const tokenPattern = new RegExp(tokenSource, "gi");
  const rows = [[]];
  let cursor = 0;

  const append = (value, kind = "") => {
    const pieces = value.split("\n");
    pieces.forEach((piece, index) => {
      if (piece) rows[rows.length - 1].push({ text: piece, kind });
      if (index < pieces.length - 1) rows.push([]);
    });
  };

  for (const match of code.matchAll(tokenPattern)) {
    append(code.slice(cursor, match.index));
    const token = match[0];
    let kind = "operator";
    if (/^["'`]/.test(token)) kind = "string";
    else if (/^(?:\/\/|\/\*|<!--|--|#)/.test(token)) kind = "comment";
    else if (/^<\/?[a-z]/i.test(token)) kind = "tag";
    else if (/^\d/.test(token)) kind = "number";
    else if (CODE_KEYWORD_SET.has(token.toLowerCase())) kind = "keyword";
    append(token, kind);
    cursor = match.index + token.length;
  }
  append(code.slice(cursor));
  return rows;
}

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
  codeElement.className = "syntax-code";
  preview.append(codeElement);

  const more = document.createElement("button");
  more.type = "button";
  more.className = "code-more-btn";

  function updatePreview() {
    const visibleLines = expanded ? lines : lines.slice(0, previewLimit);
    const highlightedLines = highlightCodeLines(visibleLines, info.language);
    const renderedLines = document.createDocumentFragment();

    highlightedLines.forEach((tokens, index) => {
      const row = document.createElement("span");
      row.className = "code-line";
      const number = document.createElement("span");
      number.className = "code-line-number";
      number.textContent = String(index + 1);
      number.setAttribute("aria-hidden", "true");
      const content = document.createElement("span");
      content.className = "code-line-content";

      if (!tokens.length) content.textContent = "\u00a0";
      for (const token of tokens) {
        if (!token.kind) {
          content.append(document.createTextNode(token.text));
          continue;
        }
        const highlighted = document.createElement("span");
        highlighted.className = `syntax-${token.kind}`;
        highlighted.textContent = token.text;
        content.append(highlighted);
      }

      row.append(number, content);
      renderedLines.append(row);
    });
    codeElement.replaceChildren(renderedLines);

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

  if (message.streaming || message.incomplete) {
    const partial = document.createElement("div");
    partial.className = "assistant-text streaming-text";
    partial.textContent = message.content || "DARK IA está generando una respuesta…";
    container.append(partial);
    if (message.streaming) {
      const cursor = document.createElement("span");
      cursor.className = "stream-cursor";
      cursor.setAttribute("aria-hidden", "true");
      container.append(cursor);
    }
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
      if (isValidImageRef(message.imageRef)) {
        const image = document.createElement("img");
        image.className = "message-image";
        image.dataset.imageId = message.imageRef.id;
        image.alt = `Foto adjunta: ${String(message.imageRef.name || "imagen").slice(0, 120)}`;
        image.loading = "lazy";
        bubble.append(image);
      }
      if (message.content) {
        const text = document.createElement("div");
        text.className = "message-text";
        text.textContent = message.content;
        bubble.append(text);
      } else if (isValidImageRef(message.imageRef)) {
        const label = document.createElement("div");
        label.className = "image-message-label";
        label.textContent = "Foto adjunta";
        bubble.append(label);
      }
    }

    row.append(bubble);

    if (message.role === "assistant" && message.model) {
      const modelMeta = document.createElement("div");
      modelMeta.className = "model-meta";
      if (message.model.startsWith("DARK IA · saludo exacto")) {
        modelMeta.textContent = "Saludo exacto · respuesta local, sin proveedor externo";
      } else if (message.selectedModel && message.selectedModel !== message.model) {
        modelMeta.textContent = message.selectedModel === "openrouter/free"
          ? "Router solicitado: OpenRouter Free · modelo que respondió: "
          : `Modelo solicitado: ${message.selectedModel} · modelo que respondió: `;
        const modelName = document.createElement("strong");
        modelName.textContent = message.model;
        modelMeta.append(modelName);
      } else {
        modelMeta.textContent = message.selectedModel
          ? `Modelo solicitado y ejecutado: ${message.selectedModel}`
          : `Modelo que respondió: ${message.model}`;
      }
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
        const retainedImageRef = isValidImageRef(message.imageRef) ? message.imageRef : null;
        if ((!revised?.trim() && !retainedImageRef) || busy) return;
        const activeChat = current();
        const removedImageIds = imageIdsIn(activeChat.messages.slice(messageIndex))
          .filter(id => id !== retainedImageRef?.id);
        activeChat.messages = activeChat.messages.slice(0, messageIndex);
        save();
        renderAll();
        await removeStoredImages(removedImageIds);
        await send(revised, { imageRef: retainedImageRef });
      };
      row.append(editButton);
    }

    messagesEl.append(row);
  });

  if (busy && !list.some(message => message.role === "assistant" && message.streaming)) {
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
  void hydrateMessageImages();
}

async function hydrateMessageImages() {
  const images = [...messagesEl.querySelectorAll("img[data-image-id]")];
  for (const image of images) {
    const id = image.dataset.imageId;
    try {
      let url = photoObjectUrls.get(id);
      if (!url) {
        const record = await globalThis.DarkImageStore?.get(id);
        if (!record?.blob || !image.isConnected) continue;
        url = URL.createObjectURL(record.blob);
        photoObjectUrls.set(id, url);
      }
      if (image.isConnected) image.src = url;
    } catch (error) {
      if (image.isConnected) image.alt = "Foto no disponible en el almacenamiento local.";
      console.warn("No se pudo cargar una foto del historial:", error);
    }
  }
}

function renderAll() {
  renderList();
  renderMessages();
}

// ======================================
// DARK IA STUDIO - ABRIR Y CERRAR
// ======================================

function openProjects() {
  closeSidebar();

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
  const candidates = messages.filter(message =>
    message &&
    ["user", "assistant"].includes(message.role) &&
    typeof message.content === "string" &&
    (message.content.trim() || isValidImageRef(message.imageRef)) &&
    !message.streaming
  ).slice(-30);
  for (const message of candidates.reverse()) {
    if (message.content.length > remaining) break;
    selected.push({
      role: message.role,
      content: message.content,
      ...(isValidImageRef(message.imageRef) ? { imageRef: message.imageRef } : {})
    });
    remaining -= message.content.length;
  }
  return selected.reverse();
}

async function buildOpenRouterHistory(messages) {
  const history = buildRequestHistory(messages);
  const attachedMessages = history.filter(message => isValidImageRef(message.imageRef));
  const selectedImageMessage = attachedMessages.at(-1);
  const reference = selectedImageMessage?.imageRef;
  for (const message of history) delete message.imageRef;
  if (!selectedImageMessage) return history;

  const record = await globalThis.DarkImageStore?.get(reference.id);
  if (!record?.blob || record.blob.size > MAX_COMPRESSED_PHOTO_BYTES || record.blob.type !== reference.mimeType) {
    throw new Error("No se encontró una foto válida en el almacenamiento local. Vuelve a adjuntarla.");
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No se pudo preparar la foto."));
    reader.onerror = () => reject(new Error("No se pudo leer la foto guardada."));
    reader.readAsDataURL(record.blob);
  });
  const parts = [];
  if (selectedImageMessage.content.trim()) parts.push({ type: "text", text: selectedImageMessage.content });
  parts.push({ type: "image_url", image_url: { url: dataUrl } });
  selectedImageMessage.content = parts;
  return history;
}

async function consumeChatEventStream(response, onEvent) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Este navegador no pudo leer la respuesta progresiva.");
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  function dispatch(frame) {
    let type = "message";
    const dataLines = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) type = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
    }
    if (!dataLines.length) return;

    let payload;
    try {
      payload = JSON.parse(dataLines.join("\n"));
    } catch {
      throw new Error("DARK IA recibió un evento de respuesta inválido.");
    }
    if (type === "error") throw new Error(payload?.error || "El proveedor interrumpió la respuesta.");
    if (type === "complete") completed = true;
    onEvent(type, payload);
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        dispatch(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
      }
    }
    buffer += decoder.decode();
    buffer = buffer.replace(/\r\n/g, "\n");
    if (buffer.trim()) dispatch(buffer);
  } finally {
    reader.releaseLock();
  }

  if (!completed) throw new Error("La conexión terminó antes de completar la respuesta.");
}

function scheduleStreamingRender(chat) {
  if (streamRenderQueued) return;
  streamRenderQueued = true;
  requestAnimationFrame(() => {
    streamRenderQueued = false;
    if (current()?.id === chat.id) renderMessages();
  });
}

async function send(text, { appendUser = true, modeOverride = null, imageRef = null } = {}) {
  const content = String(text || "").trim();
  const photo = isValidImageRef(imageRef) ? imageRef : (appendUser ? pendingPhoto : null);
  if ((!content && !photo) || busy) return;
  if (!current()) newChat();
  const chat = current();
  const requestMode = modeOverride || $("modeSelect").value || chat.mode || "general";
  if (photo && !photoSupportedBy(chat.model)) {
    toast("El modelo de este chat no declara compatibilidad con fotos. Elige OpenRouter Free · automático o un modelo con visión.");
    return;
  }
  if (!freeModelIds.has(chat.model)) {
    toast("Este modelo ya no está disponible gratis. Elige una opción disponible para abrir un chat nuevo.");
    return;
  }
  chat.mode = requestMode;
  if (appendUser) {
    chat.messages.push({
      role: "user",
      content,
      mode: requestMode,
      ...(photo ? { imageRef: photo } : {})
    });
  }

  if (photo && pendingPhoto?.id === photo.id) {
    pendingPhoto = null;
    if (pendingPhotoObjectUrl) URL.revokeObjectURL(pendingPhotoObjectUrl);
    pendingPhotoObjectUrl = null;
    $("photoAttachment").hidden = true;
    $("photoStatus").textContent = "Foto añadida al mensaje.";
  }

  if (chat.title === "Nuevo chat") {
    chat.title =
      (content || "Foto adjunta").slice(0, 34) +
      (content.length > 34 ? "…" : "");
  }
  const assistantMessage = {
    role: "assistant",
    content: "",
    model: "Generando…",
    selectedModel: chat.model,
    sources: [],
    streaming: true
  };
  chat.messages.push(assistantMessage);
  promptEl.value = "";
  promptEl.style.height = "auto";
  busy = true;
  const controller = new AbortController();
  activeController = controller;
  save(chat);
  renderAll();
  $("sendBtn").disabled = true;
  updatePhotoControl();
  $("stopBtn").hidden = false;
  $("modelSelect").disabled = true;
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: await buildOpenRouterHistory(chat.messages),
        model: chat.model,
        mode: requestMode,
        personality: settings.personality,
        emojiLevel: settings.emojiLevel,
        useSources: $("useSources").checked,
        stream: true
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || `El servidor respondió con HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      await consumeChatEventStream(response, (event, data) => {
        if (event === "delta" && typeof data.text === "string") {
          assistantMessage.content += data.text;
          scheduleStreamingRender(chat);
        } else if (event === "complete") {
          if (!assistantMessage.content && typeof data.answer === "string") assistantMessage.content = data.answer;
          assistantMessage.model = data.model || assistantMessage.model;
          assistantMessage.selectedModel = data.selectedModel || chat.model;
          assistantMessage.sources = Array.isArray(data.sources) ? data.sources : [];
          assistantMessage.sourceAvailability = data.sourceAvailability || null;
        }
      });
    } else {
      const data = await response.json();
      if (typeof data.answer !== "string") throw new Error("La respuesta de la IA no es válida.");
      assistantMessage.content = data.answer;
      assistantMessage.model = data.model || assistantMessage.model;
      assistantMessage.selectedModel = data.selectedModel || chat.model;
      assistantMessage.sources = Array.isArray(data.sources) ? data.sources : [];
      assistantMessage.sourceAvailability = data.sourceAvailability || null;
    }
    if (!assistantMessage.content.trim()) throw new Error("El modelo no generó una respuesta.");
    assistantMessage.streaming = false;
    assistantMessage.incomplete = false;
  } catch (err) {
    const placeholderIndex = chat.messages.indexOf(assistantMessage);
    if (placeholderIndex !== -1) {
      if (assistantMessage.content.trim()) {
        assistantMessage.streaming = false;
        assistantMessage.incomplete = true;
      } else {
        chat.messages.splice(placeholderIndex, 1);
      }
    }
    chat.messages.push({
      role: "assistant",
      content: err.name === "AbortError"
        ? "Generación detenida. El mensaje enviado se conserva en el historial."
        : "No pude completar la solicitud: " + String(err.message || "Error de conexión.").slice(0, 500),
      error: err.name !== "AbortError"
    });
  } finally {
    busy = false;
    if (activeController === controller) activeController = null;
    $("sendBtn").disabled = false;
    $("stopBtn").hidden = true;
    $("modelSelect").disabled = false;
    updatePhotoControl();
    save(chat);
    renderAll();
  }
}

async function retryResponse(errorIndex) {
  const chat = current();
  if (busy || !chat || !chat.messages[errorIndex]?.error) return;

  let previousUserIndex = -1;
  for (let index = errorIndex - 1; index >= 0; index -= 1) {
    if (chat.messages[index]?.role === "user") {
      previousUserIndex = index;
      break;
    }
  }
  const previousUser = chat.messages[previousUserIndex];
  if (!previousUser) return;

  const prompt = previousUser.content;
  const retainedImageRef = isValidImageRef(previousUser.imageRef) ? previousUser.imageRef : null;
  chat.messages = chat.messages.slice(0, previousUserIndex + 1);
  save();
  renderAll();
  await send(prompt, { appendUser: false, modeOverride: previousUser.mode || $("modeSelect").value, imageRef: retainedImageRef });
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
    modelCapabilities = new Map(data.models.map(model => [model.id, {
      supportsVision: model.supportsVision === true,
      dynamicVisionRouting: model.dynamicVisionRouting === true
    }]));
    select.replaceChildren();
    data.models.forEach(model => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.id === "openrouter/free"
        ? "OpenRouter Free · router automático (modelo variable)"
        : `${model.name} · ${model.id}`;
      option.title = model.id;
      select.append(option);
    });
    const activeModel = current()?.model;
    const activeExists = data.models.some(model => model.id === activeModel);
    const savedExists = data.models.some(model => model.id === savedModel);
    if (activeModel && !activeExists) {
      const unavailable = document.createElement("option");
      unavailable.value = activeModel;
      unavailable.textContent = `${activeModel} · no aparece en el catálogo actual`;
      unavailable.title = "No se cambiará este chat automáticamente. Elige otro modelo para crear un chat nuevo.";
      unavailable.disabled = true;
      select.append(unavailable);
    }
    select.value = activeExists ? activeModel : savedExists ? savedModel : data.defaultModel;
    if (activeModel && !activeExists) {
      select.value = activeModel;
      $("modelExplanation").textContent = "Este chat conserva su modelo original; no aparece en el catálogo actual. Elige otro modelo para abrir un chat nuevo.";
    }
    if (!current()) newChat();
    select.addEventListener("change", () => {
      const active = current();
      if (pendingPhoto && !photoSupportedBy(select.value)) {
        select.value = active?.model || "openrouter/free";
        toast("Quita la foto o elige un modelo con visión para adjuntarla.");
        updatePhotoControl();
        return;
      }
      try { localStorage.setItem(STORAGE_MODEL, select.value); }
      catch (error) { console.warn("No se pudo guardar el modelo seleccionado:", error); }
      if (active?.model !== select.value) {
        if (active) save(active);
        newChat();
        toast(`Nuevo chat con ${select.selectedOptions[0]?.textContent || select.value}.`);
      }
      updatePhotoControl();
    });
    updatePhotoControl();
  } catch (error) {
    console.warn("No se pudo actualizar el catálogo de modelos:", error);
    const activeModel = current()?.model;
    if (activeModel && activeModel !== "openrouter/free") {
      const unavailable = document.createElement("option");
      unavailable.value = activeModel;
      unavailable.textContent = `${activeModel} · catálogo no disponible`;
      unavailable.disabled = true;
      select.append(unavailable);
      select.value = activeModel;
      $("modelExplanation").textContent = "No se pudo actualizar el catálogo. Este chat conserva su modelo y no se cambiará automáticamente.";
    }
    if (!current()) newChat();
    updatePhotoControl();
  }
}

async function decodePhoto(file) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch {}
  }
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo abrir la imagen seleccionada."));
    };
    image.src = objectUrl;
  });
}

async function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("No se pudo comprimir la foto.")), "image/jpeg", quality);
  });
}

async function compressPhoto(file) {
  const image = await decodePhoto(file);
  try {
    for (const maxSide of [1600, 1280, 960]) {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Este navegador no permite preparar la foto.");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.84, 0.74, 0.64, 0.54]) {
        const blob = await canvasBlob(canvas, quality);
        if (blob.type === "image/jpeg" && blob.size <= MAX_COMPRESSED_PHOTO_BYTES) return blob;
      }
    }
    throw new Error("La foto sigue superando 600 KiB tras comprimirla. Elige una imagen más pequeña.");
  } finally {
    image.close?.();
  }
}

async function handlePhotoSelection(event) {
  const file = event.currentTarget.files?.[0];
  event.currentTarget.value = "";
  if (!file) return;
  if (!photoSupportedBy()) {
    toast("El modelo seleccionado no admite fotos. Elige un modelo con visión.");
    return;
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    toast("Solo se admiten fotos JPEG, PNG o WEBP.");
    return;
  }
  if (file.size <= 0 || file.size > MAX_SOURCE_PHOTO_BYTES) {
    toast("La foto original debe pesar como máximo 10 MiB.");
    return;
  }

  photoProcessing = true;
  updatePhotoControl();
  $("photoStatus").textContent = "Comprimiendo y guardando la foto en este navegador…";
  try {
    await inspectPhotoDimensions(file);
    const blob = await compressPhoto(file);
    if (!photoSupportedBy()) throw new Error("El modelo seleccionado ya no admite fotos.");
    const reference = {
      id: makeId(),
      name: String(file.name || "foto").slice(0, 120),
      mimeType: blob.type,
      size: blob.size
    };
    await globalThis.DarkImageStore.save({ ...reference, blob, savedAt: new Date().toISOString() });
    const oldId = pendingPhoto?.id;
    if (pendingPhotoObjectUrl) URL.revokeObjectURL(pendingPhotoObjectUrl);
    pendingPhoto = reference;
    pendingPhotoObjectUrl = URL.createObjectURL(blob);
    $("photoPreview").src = pendingPhotoObjectUrl;
    $("photoName").textContent = `${reference.name} · ${(reference.size / 1024).toFixed(0)} KiB`;
    $("photoAttachment").hidden = false;
    $("photoStatus").textContent = `Foto preparada: ${reference.name}.`;
    if (oldId) void removeStoredImages([oldId]);
  } catch (error) {
    toast(error.message || "No se pudo preparar la foto.");
    $("photoStatus").textContent = error.message || "No se pudo preparar la foto.";
  } finally {
    photoProcessing = false;
    updatePhotoControl();
  }
}

async function discardPendingPhoto() {
  const id = pendingPhoto?.id;
  pendingPhoto = null;
  if (pendingPhotoObjectUrl) URL.revokeObjectURL(pendingPhotoObjectUrl);
  pendingPhotoObjectUrl = null;
  $("photoAttachment").hidden = true;
  $("photoPreview").removeAttribute("src");
  $("photoName").textContent = "";
  if (id) await removeStoredImages([id]);
  $("photoStatus").textContent = "Foto quitada.";
  updatePhotoControl();
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
    let recoveredInterruptedStream = false;
    for (const chat of chats) {
      for (let index = chat.messages.length - 1; index >= 0; index -= 1) {
        const message = chat.messages[index];
        if (message?.role !== "assistant" || !message.streaming) continue;
        message.streaming = false;
        message.incomplete = Boolean(String(message.content || "").trim());
        if (!message.incomplete) chat.messages.splice(index, 1);
        chat.messages.push({
          role: "assistant",
          content: "La generación se interrumpió antes de terminar. Puedes reintentar la respuesta.",
          error: true
        });
        recoveredInterruptedStream = true;
      }
    }
    activeId = chats[0]?.id || null;
    if (recoveredInterruptedStream) save();
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
  closeSidebar();
  $("personalitySelect").value = settings.personality;
  $("emojiLevelSelect").value = settings.emojiLevel;
  updatePreferenceDescriptions();
  const dialog = $("preferencesDialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function updatePreferenceDescriptions() {
  const personalityDescriptions = {
    professional: "Tono serio, claro y respetuoso.",
    cheerful: "Cálido y optimista; celebra avances y usa humor ligero sin exagerar.",
    direct: "Frío y sobrio: va al grano con franqueza, pero sin hostilidad.",
    friendly: "Cercano, amable y atento a las necesidades de la persona.",
    creative: "Imaginativo y original, manteniendo claridad y utilidad.",
    teacher: "Didáctico y paciente; explica paso a paso y comprueba conceptos."
  };
  const emojiDescriptions = {
    none: "Cero emojis, stickers o emoticonos.",
    low: "Hasta 3 emojis por respuesta completa.",
    medium: "Uso moderado: 3–5 en respuestas largas, menos que en «Usar siempre».",
    always: "Uso frecuente: 6–10 en respuestas largas y al menos 1 en una respuesta breve."
  };
  $("personalityDescription").textContent = personalityDescriptions[$("personalitySelect").value] || personalityDescriptions.professional;
  $("emojiLevelDescription").textContent = emojiDescriptions[$("emojiLevelSelect").value] || emojiDescriptions.none;
}

function startIntroAnimation() {
  const splash = $("introSplash");
  const appShell = $("appShell");
  const skipButton = $("skipIntro");
  if (!splash || !appShell || !skipButton) return;

  const reduceMotion = typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    splash.hidden = true;
    return;
  }

  appShell.inert = true;
  let exitTimer;
  const dismiss = () => {
    if (splash.classList.contains("is-exiting")) return;
    window.clearTimeout(exitTimer);
    const focusWasOnSkip = document.activeElement === skipButton;
    splash.classList.add("is-exiting");
    window.setTimeout(() => {
      splash.hidden = true;
      appShell.inert = false;
      if (focusWasOnSkip) $("menuBtn").focus();
    }, 450);
  };

  skipButton.addEventListener("click", dismiss, { once: true });
  exitTimer = window.setTimeout(dismiss, 3000);
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
$("personalitySelect").addEventListener("change", updatePreferenceDescriptions);
$("emojiLevelSelect").addEventListener("change", updatePreferenceDescriptions);
$("useSources").addEventListener("change", () => {
  settings.useSources = $("useSources").checked;
  if (STORAGE_PREFERENCES) {
    try { localStorage.setItem(STORAGE_PREFERENCES, JSON.stringify(settings)); }
    catch { toast("No se pudo guardar esta preferencia."); }
  }
});
$("clearGuestChatsBtn").addEventListener("click", async () => {
  if (!confirm("¿Borrar todos los chats guardados en este navegador? No podrás recuperarlos.")) return;
  const imageIds = [...chats.flatMap(chat => imageIdsIn(chat.messages)), pendingPhoto?.id].filter(Boolean);
  chats = [];
  activeId = null;
  pendingPhoto = null;
  if (pendingPhotoObjectUrl) URL.revokeObjectURL(pendingPhotoObjectUrl);
  pendingPhotoObjectUrl = null;
  $("photoAttachment").hidden = true;
  await removeStoredImages(imageIds);
  try { await globalThis.DarkImageStore?.clear(); } catch {}
  save({ id: "local-only" });
  renderAll();
  toast("Se borró el historial de este navegador.");
});

$("chatForm").addEventListener("submit", event => {
  event.preventDefault();
  send(promptEl.value);
});
$("attachPhoto").addEventListener("click", () => {
  if (!$("attachPhoto").disabled) $("photoInput").click();
});
$("photoInput").addEventListener("change", handlePhotoSelection);
$("removePhoto").addEventListener("click", () => { void discardPendingPhoto(); });

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

$("newChat").onclick = () => {
  newChat();
  closeSidebar();
};

$("searchChats").addEventListener("input", renderList);

$("stopBtn").addEventListener("click", () => {
  activeController?.abort();
});

$("clearBtn").onclick = () => {
  if (!current()) return;

  const removedImageIds = imageIdsIn(current().messages);
  current().messages = [];
  current().title = "Nuevo chat";
  void removeStoredImages(removedImageIds);

  save();
  renderAll();

  toast("Conversación borrada.");
};

$("menuBtn").onclick = () => {
  setSidebarOpen(!$("sidebar").classList.contains("open"));
};
$("sidebarBackdrop").addEventListener("click", () => closeSidebar(true));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && $("sidebar").classList.contains("open")) closeSidebar(true);
});

$("navChat").onclick = () => {
  closeApps();
  $("navChat").classList.add("active");
  closeSidebar();
};
$("navApps").onclick = openApps;
$("closeApps").onclick = closeApps;
$("navWhatsApp").addEventListener("click", () => closeSidebar());
$("appsDialog").addEventListener("close", () => {
  $("navApps").classList.remove("active");
  $("navChat").classList.add("active");
});
$("appSearchForm").addEventListener("submit", event => {
  event.preventDefault();
  const query = $("appSearchQuery").value.trim();
  if (!query) return;
  renderAppSearchLinks(query);
});
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

startIntroAnimation();

// Abrir el chat y el Studio únicamente tras validar la sesión en el servidor.
initializeApplication();
  
