import test from "node:test";
import assert from "node:assert/strict";
import { breventReferencesForQuery, buildSourceContext, searchPublicSources } from "../src/search.js";

function response(data) {
  return { ok: true, json: async () => data };
}

test("búsqueda pública consulta solo GitHub Search y Stack Overflow y descarta URLs fuera de dominio", async () => {
  const requested = [];
  const fakeFetch = async (url, options) => {
    requested.push({ url: new URL(url), options });
    if (new URL(url).hostname === "api.github.com") {
      return response({ items: [
        { full_name: "owner/repo", html_url: "https://github.com/owner/repo", description: "Repo público", language: "TypeScript", stargazers_count: 4 },
        { full_name: "evil/link", html_url: "https://github.com.attacker.example/evil/link", description: "No permitido" }
      ] });
    }
    return response({ items: [
      { title: "Pregunta útil", link: "https://stackoverflow.com/questions/123/test", score: 7, is_answered: true, tags: ["node.js"] },
      { title: "Enlace dudoso", link: "http://stackoverflow.com/questions/456/test", score: 0, tags: [] }
    ] });
  };

  const result = await searchPublicSources("  seguridad Node  ", fakeFetch);
  assert.equal(requested.length, 2);
  assert.deepEqual(new Set(requested.map(item => item.url.hostname)), new Set(["api.github.com", "api.stackexchange.com"]));
  assert.ok(requested.every(item => item.url.searchParams.get("q") === "seguridad Node"));
  assert.ok(requested.every(item => item.options.signal instanceof AbortSignal));
  assert.deepEqual(result.availability, { github: true, stackoverflow: true });
  assert.deepEqual(result.sources.map(source => source.provider), ["GitHub", "Stack Overflow"]);
  assert.ok(result.sources.every(source => ["github.com", "stackoverflow.com"].includes(new URL(source.url).hostname)));
});

test("consulta vacía no contacta proveedores", async () => {
  let calls = 0;
  const result = await searchPublicSources("  \n  ", async () => { calls += 1; throw new Error("No debería llamarse"); });
  assert.equal(calls, 0);
  assert.deepEqual(result, { sources: [], availability: { github: false, stackoverflow: false } });
});

test("el contexto no afirma que encontró fuentes si no hubo enlaces", () => {
  const context = buildSourceContext([], { github: false, stackoverflow: true });
  assert.match(context, /no se recibieron resultados enlazables/);
  assert.match(context, /no digas que encontraste o verificaste fuentes/i);
});

test("las consultas sobre Brevent añaden solo enlaces oficiales verificables", () => {
  const references = breventReferencesForQuery("¿Comandos Brevent para rendimiento?");
  assert.equal(references.length, 3);
  assert.ok(references.every(reference => new URL(reference.url).hostname === "github.com"));
  assert.ok(references.some(reference => reference.url.includes("Exec-Command-via-Brevent")));
  assert.deepEqual(breventReferencesForQuery("optimizar batería Android"), []);
});
