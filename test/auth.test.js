import test from "node:test";
import assert from "node:assert/strict";
import { validateStoredMessages } from "../src/auth.js";

test("almacenamiento de chat acepta solamente contenido acotado con roles válidos", () => {
  assert.equal(validateStoredMessages([{ role: "user", content: "hola" }]), true);
  assert.equal(validateStoredMessages([{ role: "system", content: "secreto" }]), false);
  assert.equal(validateStoredMessages([{ role: "assistant", content: "x".repeat(20_001) }]), false);
  assert.equal(validateStoredMessages([{ role: "user", content: "x".repeat(250_001) }, { role: "assistant", content: "y".repeat(250_001) }]), false);
  assert.equal(validateStoredMessages(Array.from({ length: 501 }, () => ({ role: "user", content: "x" }))), false);
});
