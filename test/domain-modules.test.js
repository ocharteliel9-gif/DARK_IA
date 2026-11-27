import test from "node:test";
import assert from "node:assert/strict";
import { DOMAIN_MODES, DOMAIN_MODE_IDS, UNIVERSAL_TECHNICAL_WORKFLOW, FAIR_PLAY_POLICY } from "../src/domain-modules.js";

test("incluye módulos generales, gaming, modding, motores y diagnóstico", () => {
  for (const id of ["general", "gaming", "modding", "gamedev", "unity", "unreal", "godot", "game_support", "diagnostics", "coding", "knowledge"]) {
    assert.ok(DOMAIN_MODES[id], `Falta el módulo ${id}`);
    assert.ok(DOMAIN_MODES[id].name);
    assert.ok(DOMAIN_MODES[id].instruction.length > 80);
  }
  assert.equal(DOMAIN_MODE_IDS.length, Object.keys(DOMAIN_MODES).length);
});

test("el flujo técnico exige versiones/contexto y copias de seguridad cuando corresponda", () => {
  assert.match(UNIVERSAL_TECHNICAL_WORKFLOW, /versión/i);
  assert.match(UNIVERSAL_TECHNICAL_WORKFLOW, /respaldo/i);
  assert.match(UNIVERSAL_TECHNICAL_WORKFLOW, /No inventes comandos/i);
});

test("la política distingue modding legítimo de trampas y evasión anticheat", () => {
  assert.match(FAIR_PLAY_POLICY, /mods permitidos/i);
  assert.match(FAIR_PLAY_POLICY, /anticheat/i);
  assert.match(FAIR_PLAY_POLICY, /prototipo propio/i);
});
