import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { createServer } from "node:http";

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

test("/api/chat transmite fragmentos SSE sin exponer la clave del servidor", async t => {
  let providerRequest;
  const provider = createServer((req, res) => {
    if (req.url === "/models") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{
        id: "openai/test-model:free",
        name: "Test model",
        pricing: { prompt: "0", completion: "0" }
      }] }));
      return;
    }

    if (req.url !== "/chat/completions") {
      res.writeHead(404).end();
      return;
    }

    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      providerRequest = { headers: req.headers, body: JSON.parse(body) };
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "X-OpenRouter-Model": "openai/test-model:free"
      });
      res.write('data: {"choices":[{"delta":{"content":"Respuesta "}}]}\n\n');
      res.write('data: {"choices":[{"delta":{"content":"progresiva"}}]}\n\n');
      res.end("data: [DONE]\n\n");
    });
  });

  await new Promise(resolve => provider.listen(0, "127.0.0.1", resolve));
  const providerPort = provider.address().port;
  const appPort = await freePort();
  const appUrl = `http://127.0.0.1:${appPort}`;
  const appProcess = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(appPort),
      TRUST_PROXY_HOPS: "0",
      OPENROUTER_API_KEY: "test-key-not-for-client",
      OPENROUTER_URL: `http://127.0.0.1:${providerPort}/chat/completions`,
      OPENROUTER_MODELS_URL: `http://127.0.0.1:${providerPort}/models`
    },
    stdio: "ignore"
  });

  t.after(async () => {
    const exited = appProcess.exitCode !== null
      ? Promise.resolve()
      : new Promise(resolve => appProcess.once("exit", resolve));
    appProcess.kill("SIGTERM");
    await exited;
    await new Promise(resolve => provider.close(resolve));
  });

  const startedAt = Date.now();
  let ready = false;
  while (Date.now() - startedAt < 8000) {
    if (appProcess.exitCode !== null) throw new Error(`Servidor de streaming salió con código ${appProcess.exitCode}`);
    try {
      const response = await fetch(`${appUrl}/api/status`);
      if (response.ok) { ready = true; break; }
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  assert.equal(ready, true, "El servidor de streaming no estuvo listo dentro de 8 segundos.");

  const response = await fetch(`${appUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Prueba de streaming" }],
      model: "openrouter/free",
      stream: true
    })
  });
  const eventText = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/event-stream/);
  assert.match(eventText, /event: delta/);
  assert.match(eventText, /Respuesta /);
  assert.match(eventText, /progresiva/);
  assert.match(eventText, /event: complete/);
  assert.equal(providerRequest.body.stream, true);
  assert.equal(providerRequest.headers.authorization, "Bearer test-key-not-for-client");
  assert.doesNotMatch(eventText, /test-key-not-for-client/);
});
