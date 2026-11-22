import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_IMAGE_BYTES,
  getMessageText,
  messageHasImage,
  messagesHaveImage,
  validateImageDataUrl,
  validateMessages
} from "../src/chat-validation.js";

const jpegDataUrl = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64")}`;
const imagePart = { type: "image_url", image_url: { url: jpegDataUrl } };

test("valida imagen JPEG por MIME, Base64 canónico y firma binaria", () => {
  assert.equal(validateImageDataUrl(jpegDataUrl), true);
  assert.equal(validateImageDataUrl("data:image/png;base64,/9j/2Q=="), false);
  assert.equal(validateImageDataUrl("data:image/jpeg;base64,/9j/==="), false);
  assert.equal(validateImageDataUrl("https://example.com/photo.jpg"), false);
  assert.equal(validateImageDataUrl(null), false);
});

test("rechaza imágenes vacías o sobre el límite comprimido", () => {
  const tooLarge = Buffer.alloc(MAX_IMAGE_BYTES + 1);
  tooLarge.set([0xff, 0xd8, 0xff, 0xd9]);
  const largeDataUrl = `data:image/jpeg;base64,${tooLarge.toString("base64")}`;
  assert.equal(validateImageDataUrl("data:image/jpeg;base64,/w=="), false);
  assert.equal(validateImageDataUrl(largeDataUrl), false);
});

test("acepta una imagen sola o texto con una imagen en mensaje de usuario", () => {
  assert.equal(validateMessages([{ role: "user", content: [imagePart] }]), true);
  assert.equal(validateMessages([{ role: "user", content: [
    { type: "text", text: "¿Qué muestra esta foto?" },
    imagePart
  ] }]), true);
  assert.equal(getMessageText([imagePart]), "");
  assert.equal(getMessageText([{ type: "text", text: "¿Qué muestra?" }, imagePart]), "¿Qué muestra?");
  assert.equal(messageHasImage([imagePart]), true);
  assert.equal(messagesHaveImage([{ role: "user", content: [imagePart] }]), true);
});

test("rechaza imágenes en mensajes assistant, múltiples imágenes y partes desconocidas", () => {
  assert.equal(validateMessages([{ role: "assistant", content: [imagePart] }]), false);
  assert.equal(validateMessages([{ role: "user", content: [imagePart, imagePart] }]), false);
  assert.equal(validateMessages([{ role: "user", content: [{ type: "audio", data: "..." }, imagePart] }]), false);
  assert.equal(validateMessages([
    { role: "user", content: [imagePart] },
    { role: "user", content: [imagePart] }
  ]), false);
});
