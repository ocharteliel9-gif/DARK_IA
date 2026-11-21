import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";

let server;
let baseUrl;

async function freePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const { port } = probe.address();
  await new Promise(resolve => probe.close(resolve));
  return port;
}

before(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), OPENROUTER_API_KEY: "" };
  server = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env,
    stdio: "ignore"
  });

  const startedAt = Date.now();
  while (Date.now() - startedAt < 8000) {
    if (server.exitCode !== null) throw new Error(`Servidor salió con código ${server.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/status`);
      if (response.ok) return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  throw new Error("El servidor no estuvo listo dentro de 8 segundos.");
});

after(() => {
  server?.kill("SIGTERM");
});

test("status indica que no se configuró una clave externa", async () => {
  const response = await fetch(`${baseUrl}/api/status`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.configured, false);
  assert.equal(data.authConfigured, false);
});

test("la puerta de acceso falla de forma cerrada si Google y PostgreSQL no están configurados", async () => {
  const me = await fetch(`${baseUrl}/api/me`);
  const status = await me.json();
  assert.equal(status.configured, false);
  assert.equal(status.authenticated, false);
  assert.equal(me.headers.get("cache-control"), "no-store");

  const google = await fetch(`${baseUrl}/auth/google`);
  assert.equal(google.status, 503);

  const chats = await fetch(`${baseUrl}/api/chats`);
  assert.equal(chats.status, 503);
  assert.equal(chats.headers.get("cache-control"), "no-store");
  assert.match((await chats.json()).error, /inicio de sesión seguro/);
});

test("catálogo solo expone los modelos permitidos y un default válido", async () => {
  const response = await fetch(`${baseUrl}/api/models`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(data.models) && data.models.length > 0);
  assert.ok(data.models.some(model => model.id === data.defaultModel));
});

test("modos se sirven desde el backend", async () => {
  const response = await fetch(`${baseUrl}/api/modes`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.ok(data.modes.some(mode => mode.id === "general"));
});

test("chat no acepta mensajes ni lee historial sin una sesión autenticada", async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Hola" }] })
  });
  const data = await response.json();
  assert.equal(response.status, 503);
  assert.equal(data.success, false);
  assert.match(data.error, /inicio de sesión seguro/);
});

test("validador HTTP comprueba TypeScript sin ejecutar contenido", async () => {
  const response = await fetch(`${baseUrl}/api/code/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: "ts", code: "const answer: number = 42;" })
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.valid, true);
  assert.match(data.note, /no ejecuta/);
});

test("validador HTTP responde con diagnóstico de sintaxis", async () => {
  const response = await fetch(`${baseUrl}/api/code/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: "js", code: "function {" })
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.valid, false);
  assert.ok(data.diagnostics.length > 0);
});

test("chat aplica un límite por IP en lugar de exponer llamadas ilimitadas al proveedor", async () => {
  let limited = false;

  for (let attempt = 0; attempt < 22; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "prueba" }] })
    });

    if (response.status === 429) {
      const data = await response.json();
      assert.match(data.error, /minuto/);
      limited = true;
      break;
    }
  }

  assert.equal(limited, true);
});
