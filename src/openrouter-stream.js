function extractText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map(part => typeof part === "string" ? part : typeof part?.text === "string" ? part.text : "").join("");
}

/**
 * Consume the Server-Sent Events stream returned by OpenRouter's chat completions API.
 * `onDelta` receives only generated text; provider metadata and control events are not exposed.
 */
export async function consumeOpenRouterStream(body, onDelta = () => {}) {
  if (!body || typeof body.getReader !== "function") {
    throw new Error("El proveedor no devolvió un flujo de respuesta legible.");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let model = null;
  let finished = false;

  function processFrame(frame) {
    const data = frame
      .split("\n")
      .filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).replace(/^ /, ""))
      .join("\n");

    if (!data) return;
    if (data.trim() === "[DONE]") {
      finished = true;
      return;
    }

    let payload;
    try {
      payload = JSON.parse(data);
    } catch {
      throw new Error("El proveedor envió un evento de respuesta inválido.");
    }

    if (payload?.error) {
      const providerMessage = typeof payload.error.message === "string"
        ? payload.error.message
        : "Error durante la generación.";
      throw new Error(providerMessage);
    }

    if (typeof payload?.model === "string") model = payload.model;
    const delta = extractText(payload?.choices?.[0]?.delta?.content);
    if (delta) {
      answer += delta;
      onDelta(delta);
    }
  }

  try {
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary;
      while (!finished && (boundary = buffer.indexOf("\n\n")) !== -1) {
        processFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
      }
    }

    buffer += decoder.decode();
    buffer = buffer.replace(/\r\n/g, "\n");
    if (!finished && buffer.trim()) processFrame(buffer);
  } finally {
    reader.releaseLock();
  }

  if (!answer.trim()) {
    throw new Error("El modelo no generó una respuesta.");
  }
  return { answer, model };
}
