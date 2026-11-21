const MODELS_ENDPOINT = process.env.OPENROUTER_MODELS_URL || "https://openrouter.ai/api/v1/models";
const REFRESH_MS = 10 * 60 * 1000;
const FALLBACK_MODELS = [{ id: "openrouter/free", name: "OpenRouter Free · automático" }];
let cachedModels = null;
let cachedAt = 0;
let refreshPromise = null;

function isZeroPrice(value) {
  return typeof value === "string" && Number(value) === 0;
}

export function filterFreeModels(items) {
  if (!Array.isArray(items)) return [...FALLBACK_MODELS];
  const unique = new Map(FALLBACK_MODELS.map(model => [model.id, model]));
  for (const item of items) {
    if (!item || typeof item.id !== "string" || !/^[a-z0-9._-]+\/[a-z0-9._-]+:[a-z0-9._-]+$/i.test(item.id)) continue;
    if (!item.id.endsWith(":free") || !isZeroPrice(item.pricing?.prompt) || !isZeroPrice(item.pricing?.completion)) continue;
    const name = typeof item.name === "string" ? item.name.slice(0, 100) : item.id;
    unique.set(item.id, { id: item.id, name: `${name} · gratis (cuota variable)` });
  }
  return [...unique.values()].sort((a, b) => a.id === "openrouter/free" ? -1 : b.id === "openrouter/free" ? 1 : a.name.localeCompare(b.name));
}

export async function listFreeModels(fetchImpl = fetch, now = Date.now()) {
  if (cachedModels && now - cachedAt < REFRESH_MS) return cachedModels;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetchImpl(MODELS_ENDPOINT, {
        headers: { Accept: "application/json", "User-Agent": "DARK-IA/1.0" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`OpenRouter catálogo ${response.status}`);
      const data = await response.json();
      const filtered = filterFreeModels(data.data);
      cachedModels = filtered;
      cachedAt = now;
      return filtered;
    } catch {
      return cachedModels || [...FALLBACK_MODELS];
    } finally {
      clearTimeout(timeout);
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export function isFreeModelId(model, models) {
  if (typeof model !== "string") return false;
  return model === "openrouter/free" || (Array.isArray(models) && models.some(item => item.id === model && model.endsWith(":free")));
}
