import test from "node:test";
import assert from "node:assert/strict";
import { explainProviderError } from "../src/provider-errors.js";

test("provider 5xx informa modelo no disponible y que no hubo fallback", () => {
  const message = explainProviderError(502, "google/gemma-4-26b-a4b-it:free", "Provider returned error");
  assert.match(message, /google\/gemma-4-26b-a4b-it:free/);
  assert.match(message, /no está disponible temporalmente/);
  assert.match(message, /No se cambió a otro modelo/);
});

test("rate limit y autorización sugieren acciones diferentes", () => {
  assert.match(explainProviderError(429, "vendor/model:free"), /Espera un momento/);
  assert.match(explainProviderError(401, "vendor/model:free"), /Revisa la clave/);
});

test("un fallo de red explica que no se cambió el modelo", () => {
  const message = explainProviderError(0, "vendor/model:free", "fetch failed");
  assert.match(message, /fallo de conexión|no pudo completar/i);
  assert.match(message, /vendor\/model:free/);
  assert.match(message, /No se cambió a otro modelo/);
});

test("errores específicos conservan solo un detalle acotado", () => {
  const message = explainProviderError(400, "vendor/model:free", "unsupported image modality");
  assert.match(message, /unsupported image modality/);
  assert.ok(message.length < 600);
});
