import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const functionStart = appSource.indexOf("function parsePhotoDimensions(bytes, mimeType) {");
const functionEnd = appSource.indexOf("\n}\n", functionStart);
assert.notEqual(functionStart, -1, "No se encontró parsePhotoDimensions en public/app.js");
assert.notEqual(functionEnd, -1, "No se pudo delimitar parsePhotoDimensions en public/app.js");
const helperSource = appSource.slice(functionStart, functionEnd + 2);
const parsePhotoDimensions = new Function("MAX_PHOTO_PIXELS", "MAX_PHOTO_DIMENSION", `${helperSource}; return parsePhotoDimensions;`)(16_000_000, 16_384);

function pngHeader(width, height) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

test("lee dimensiones JPEG/PNG/WEBP sin decodificar los píxeles", () => {
  const jpeg = new Uint8Array(21);
  jpeg.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x02, 0x00, 0x03]);
  const webp = new Uint8Array(30);
  webp.set([82, 73, 70, 70], 0);
  webp.set([87, 69, 66, 80], 8);
  webp.set([86, 80, 56, 88], 12);
  webp[16] = 10;
  webp[24] = 2;
  webp[27] = 1;

  assert.deepEqual(parsePhotoDimensions(jpeg, "image/jpeg"), { width: 3, height: 2 });
  assert.deepEqual(parsePhotoDimensions(pngHeader(1920, 1080), "image/png"), { width: 1920, height: 1080 });
  assert.deepEqual(parsePhotoDimensions(webp, "image/webp"), { width: 3, height: 2 });
});

test("rechaza dimensiones ausentes, MIME con firma discordante y fotos de más de 16 MP", () => {
  assert.equal(parsePhotoDimensions(pngHeader(5000, 4000), "image/png"), null);
  assert.equal(parsePhotoDimensions(pngHeader(16_385, 1), "image/png"), null);
  assert.equal(parsePhotoDimensions(pngHeader(1920, 1080), "image/jpeg"), null);
  assert.equal(parsePhotoDimensions(new Uint8Array([0xff, 0xd8, 0xff, 0xda]), "image/jpeg"), null);
  assert.equal(parsePhotoDimensions(new Uint8Array(30), "image/webp"), null);
});
