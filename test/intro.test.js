import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, appScript, styles] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8")
]);

test("la intro DARK IA aparece antes de la app y ofrece un botón para saltarla", () => {
  assert.match(html, /id="introSplash"/);
  assert.match(html, /DARK IA/);
  assert.match(html, /id="skipIntro"[^>]*>Saltar animación</);
  assert.ok(html.indexOf("id=\"introSplash\"") < html.indexOf("id=\"appShell\""));
});

test("las preferencias explican los tonos y niveles sin cambiar sus valores guardados", () => {
  assert.match(html, /id="personalityDescription"/);
  assert.match(html, /id="emojiLevelDescription"/);
  assert.match(html, /value="low">Bajo · máximo 3/);
  assert.match(html, /value="medium">Medio · moderado/);
  assert.match(html, /value="always">Usar siempre · alto/);
  assert.match(appScript, /function updatePreferenceDescriptions\(\)/);
});

test("la animación tiene barrido, brillo final, salida temporal y respeta movimiento reducido", () => {
  assert.match(styles, /@keyframes intro-neon-sweep/);
  assert.match(styles, /@keyframes intro-letter-light/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(appScript, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(appScript, /setTimeout\(dismiss, 3000\)/);
  assert.match(appScript, /\$\("skipIntro"\)/);
  assert.match(appScript, /skipButton\.addEventListener\("click", dismiss/);
});
