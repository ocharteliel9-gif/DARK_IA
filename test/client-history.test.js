import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const functionStart = appSource.indexOf("function buildRequestHistory(messages) {");
const functionEnd = appSource.indexOf("\n}\n", functionStart);
assert.notEqual(functionStart, -1, "No se encontró buildRequestHistory en public/app.js");
assert.notEqual(functionEnd, -1, "No se pudo delimitar buildRequestHistory en public/app.js");
const helperSource = appSource.slice(functionStart, functionEnd + 2);
const buildRequestHistory = new Function(`${helperSource}; return buildRequestHistory;`)();

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
