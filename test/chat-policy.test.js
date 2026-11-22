import test from "node:test";
import assert from "node:assert/strict";
import { EMOJI_INSTRUCTIONS, EXACT_GREETING, isExactGreeting, isValidAssistantPreferences, PERSONALITIES } from "../src/chat-policy.js";

test("hola aislado usa respuesta literal sin depender de OpenRouter", () => {
  assert.equal(EXACT_GREETING, "Hola soy una IA creada por vip modifier un creador de aplicaciones para el rendimiento no tan conocido");
  assert.equal(isExactGreeting("hola"), true);
  assert.equal(isExactGreeting("  HoLa  "), true);
  assert.equal(isExactGreeting("hola, ¿cómo estás?"), false);
  assert.equal(isExactGreeting(null), false);
});

test("las personalidades y los niveles de emojis se limitan a opciones declaradas", () => {
  assert.deepEqual(Object.keys(PERSONALITIES), ["professional", "cheerful", "direct", "friendly", "creative", "teacher"]);
  assert.deepEqual(Object.keys(EMOJI_INSTRUCTIONS), ["none", "low", "medium", "always"]);
  for (const personality of Object.keys(PERSONALITIES)) {
    for (const emojiLevel of Object.keys(EMOJI_INSTRUCTIONS)) {
      assert.equal(isValidAssistantPreferences(personality, emojiLevel, true), true);
    }
  }
  assert.equal(isValidAssistantPreferences("untrusted", "none", false), false);
  assert.equal(isValidAssistantPreferences("professional", "high", false), false);
  assert.equal(isValidAssistantPreferences("professional", "low", "yes"), false);
});

test("los niveles de emojis tienen intensidad y límites inequívocos", () => {
  assert.match(EMOJI_INSTRUCTIONS.none, /ningún emoji/i);
  assert.match(EMOJI_INSTRUCTIONS.low, /máximo 3/i);
  assert.match(EMOJI_INSTRUCTIONS.medium, /3–5/i);
  assert.match(EMOJI_INSTRUCTIONS.medium, /menos que en el nivel Usar siempre/i);
  assert.match(EMOJI_INSTRUCTIONS.always, /6–10/i);
});

test("alegre es cálido y positivo; frío/directo es conciso sin hostilidad", () => {
  assert.match(PERSONALITIES.cheerful, /optimista/i);
  assert.match(PERSONALITIES.cheerful, /sin exagerar/i);
  assert.match(PERSONALITIES.direct, /conciso/i);
  assert.match(PERSONALITIES.direct, /evita insultos/i);
});
