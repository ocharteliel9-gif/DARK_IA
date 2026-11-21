import test from "node:test";
import assert from "node:assert/strict";
import { filterFreeModels, isFreeModelId } from "../src/models.js";

test("catálogo solo conserva variantes :free con precio cero en entrada y salida", () => {
  const models = filterFreeModels([
    { id: "vendor/zero:free", name: "Zero", pricing: { prompt: "0", completion: "0" } },
    { id: "vendor/input-only:free", pricing: { prompt: "0", completion: "0.000001" } },
    { id: "vendor/paid", pricing: { prompt: "0", completion: "0" } },
    { id: "vendor/incomplete:free", pricing: { prompt: "0" } },
    { id: "not-a-valid-id", pricing: { prompt: "0", completion: "0" } }
  ]);

  assert.deepEqual(models.map(model => model.id), ["openrouter/free", "vendor/zero:free"]);
  assert.equal(isFreeModelId("vendor/zero:free", models), true);
  assert.equal(isFreeModelId("vendor/paid", models), false);
});

test("catálogo vacío mantiene solo el router gratuito y no incluye fallback de pago", () => {
  const models = filterFreeModels(null);
  assert.deepEqual(models.map(model => model.id), ["openrouter/free"]);
  assert.equal(isFreeModelId("openrouter/free", models), true);
  assert.equal(isFreeModelId("vendor/commercial", models), false);
});
