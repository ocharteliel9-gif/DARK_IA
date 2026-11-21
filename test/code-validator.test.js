import test from "node:test";
import assert from "node:assert/strict";
import { validateCode } from "../src/code-validator.js";

test("valida JavaScript moderno sin ejecutar expresiones", () => {
  delete globalThis.__darkiaValidationProbe;
  const result = validateCode("js", "globalThis.__darkiaValidationProbe = true; export const sum = (a, b) => a + b;");
  assert.equal(result.valid, true);
  assert.equal(globalThis.__darkiaValidationProbe, undefined);
});

test("reporta sintaxis JavaScript incorrecta con ubicación cuando está disponible", () => {
  const result = validateCode("javascript", "const x = 1;\nfunction {\n");
  assert.equal(result.success, true);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics[0].message.length > 0);
  assert.equal(result.diagnostics[0].line, 2);
});

test("reconoce TypeScript y TSX sin ejecutar el código", () => {
  const typed = validateCode("ts", "type User = { id: string }; const user: User = { id: '1' };");
  const component = validateCode("tsx", "const App = () => <main>OK</main>;");
  assert.equal(typed.valid, true);
  assert.equal(component.valid, true);
  assert.match(typed.note, /no ejecuta/);
});

test("valida JSON y rechaza JSON mal formado", () => {
  assert.equal(validateCode("json", '{"ok":true}').valid, true);
  const invalid = validateCode("json", '{"ok":');
  assert.equal(invalid.valid, false);
  assert.equal(invalid.language, "json");
});

test("rechaza lenguaje no soportado y texto excesivo", () => {
  assert.equal(validateCode("python", "print('x')").status, 400);
  assert.equal(validateCode("js", "x".repeat(200_001)).status, 413);
});
