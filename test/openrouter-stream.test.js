import test from "node:test";
import assert from "node:assert/strict";
import { consumeOpenRouterStream } from "../src/openrouter-stream.js";

function readableChunks(text, cuts = []) {
  const bytes = new TextEncoder().encode(text);
  const boundaries = [0, ...cuts.filter(index => index > 0 && index < bytes.length), bytes.length]
    .sort((a, b) => a - b);
  return new ReadableStream({
    start(controller) {
      for (let index = 0; index < boundaries.length - 1; index += 1) {
        controller.enqueue(bytes.slice(boundaries[index], boundaries[index + 1]));
      }
      controller.close();
    }
  });
}

test("consume texto SSE cuando los eventos y un carácter Unicode llegan divididos", async () => {
  const body = [
    'data: {"model":"openai/example:free","choices":[{"delta":{"content":"Hola "}}]}\r\n\r\n',
    'data: {"choices":[{"delta":{"content":"mundo 🌎"}}]}\r\n\r\n',
    "data: [DONE]\r\n\r\n"
  ].join("");
  const bytes = new TextEncoder().encode(body);
  const emojiStart = bytes.findIndex((byte, index) => byte === 0xf0 && bytes[index + 1] === 0x9f);
  const stream = readableChunks(body, [7, 39, emojiStart + 2, bytes.length - 4]);
  const deltas = [];

  const result = await consumeOpenRouterStream(stream, delta => deltas.push(delta));

  assert.equal(result.answer, "Hola mundo 🌎");
  assert.equal(result.model, "openai/example:free");
  assert.deepEqual(deltas, ["Hola ", "mundo 🌎"]);
});

test("consume contenido de tipo array y rechaza eventos de error del proveedor", async () => {
  const valid = readableChunks('data: {"choices":[{"delta":{"content":[{"type":"text","text":"Respuesta"}]}}]}\n\n');
  assert.equal((await consumeOpenRouterStream(valid)).answer, "Respuesta");

  const failed = readableChunks('data: {"error":{"message":"Cuota agotada"}}\n\n');
  await assert.rejects(consumeOpenRouterStream(failed), /Cuota agotada/);
});

test("rechaza flujos sin texto útil", async () => {
  const body = readableChunks("data: [DONE]\n\n");
  await assert.rejects(consumeOpenRouterStream(body), /no generó una respuesta/);
});
