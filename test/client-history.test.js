import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const imageValidatorStart = appSource.indexOf("function isValidImageRef(reference) {");
const imageValidatorEnd = appSource.indexOf("\n}\n", imageValidatorStart);
const functionStart = appSource.indexOf("function buildRequestHistory(messages) {");
const functionEnd = appSource.indexOf("\n}\n", functionStart);
const openRouterStart = appSource.indexOf("async function buildOpenRouterHistory(messages) {");
const openRouterEnd = appSource.indexOf("\n}\n", openRouterStart);
assert.notEqual(imageValidatorStart, -1, "No se encontró isValidImageRef en public/app.js");
assert.notEqual(imageValidatorEnd, -1, "No se pudo delimitar isValidImageRef en public/app.js");
assert.notEqual(functionStart, -1, "No se encontró buildRequestHistory en public/app.js");
assert.notEqual(functionEnd, -1, "No se pudo delimitar buildRequestHistory en public/app.js");
assert.notEqual(openRouterStart, -1, "No se encontró buildOpenRouterHistory en public/app.js");
assert.notEqual(openRouterEnd, -1, "No se pudo delimitar buildOpenRouterHistory en public/app.js");
const imageValidatorSource = appSource.slice(imageValidatorStart, imageValidatorEnd + 2);
const requestHistorySource = appSource.slice(functionStart, functionEnd + 2);
const helperSource = `${imageValidatorSource}\n${requestHistorySource}`;
const buildRequestHistory = new Function(`${helperSource}; return buildRequestHistory;`)();
const openRouterHistorySource = `${helperSource}\n${appSource.slice(openRouterStart, openRouterEnd + 2)}`;
const buildOpenRouterHistory = new Function("MAX_COMPRESSED_PHOTO_BYTES", `${openRouterHistorySource}; return buildOpenRouterHistory;`)(600 * 1024);

test("omite el placeholder vacío de streaming y conserva en orden los mensajes válidos", () => {
  const history = buildRequestHistory([
    { role: "user", content: "Hola" },
    { role: "assistant", content: "", streaming: true },
    { role: "assistant", content: "   " },
    { role: "assistant", content: "Respuesta anterior" },
    { role: "user", content: "Siguiente pregunta" }
  ]);

  assert.deepEqual(history, [
    { role: "user", content: "Hola" },
    { role: "assistant", content: "Respuesta anterior" },
    { role: "user", content: "Siguiente pregunta" }
  ]);
});

test("conserva la referencia de una foto sin texto para el envío multimodal", () => {
  const imageRef = { id: "123e4567-e89b-12d3-a456-426614174000", mimeType: "image/jpeg", name: "foto.jpg" };
  const history = buildRequestHistory([{ role: "user", content: "", imageRef }]);
  assert.deepEqual(history, [{ role: "user", content: "", imageRef }]);
});

test("captura la referencia de la foto antes de retirarla del historial que se envía", async () => {
  const oldStore = globalThis.DarkImageStore;
  const oldFileReader = globalThis.FileReader;
  const id = "123e4567-e89b-12d3-a456-426614174000";
  const imageRef = { id, mimeType: "image/jpeg", name: "foto.jpg" };
  const imageDataUrl = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64")}`;
  globalThis.DarkImageStore = { get: async requestedId => requestedId === id
    ? { blob: new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" }) }
    : null };
  globalThis.FileReader = class {
    readAsDataURL() {
      this.result = imageDataUrl;
      queueMicrotask(() => this.onload());
    }
  };
  try {
    const history = await buildOpenRouterHistory([{ role: "user", content: "Describe la foto", imageRef }]);
    assert.deepEqual(history, [{ role: "user", content: [
      { type: "text", text: "Describe la foto" },
      { type: "image_url", image_url: { url: imageDataUrl } }
    ] }]);
    assert.equal(Object.hasOwn(history[0], "imageRef"), false);
  } finally {
    if (oldStore === undefined) delete globalThis.DarkImageStore;
    else globalThis.DarkImageStore = oldStore;
    if (oldFileReader === undefined) delete globalThis.FileReader;
    else globalThis.FileReader = oldFileReader;
  }
});
