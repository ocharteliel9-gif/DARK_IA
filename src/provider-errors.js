const GENERIC_PROVIDER_MESSAGES = new Set([
  "provider returned error",
  "no se pudo obtener una respuesta.",
  "internal server error"
]);

export function explainProviderError(status, model, providerMessage = "") {
  const modelName = typeof model === "string" && model ? model : "el modelo seleccionado";
  const message = String(providerMessage || "").trim();
  const detail = message && !GENERIC_PROVIDER_MESSAGES.has(message.toLowerCase())
    ? ` Detalle del proveedor: ${message.slice(0, 220)}`
    : "";
  const noFallback = ` No se cambió a otro modelo (${modelName}); puedes reintentar o elegir otro modelo gratuito.`;

  if (status === 401 || status === 403) {
    return `OpenRouter rechazó la autorización (HTTP ${status}). Revisa la clave y los permisos configurados en el servidor.${noFallback}`;
  }
  if (status === 402) {
    return `El proveedor informó un problema de saldo o facturación (HTTP 402). DARK IA no cambió a un modelo de pago.${noFallback}`;
  }
  if (status === 429) {
    return `El proveedor limitó temporalmente las solicitudes (HTTP 429). Espera un momento y vuelve a intentarlo.${noFallback}`;
  }
  if (status === 400) {
    return `OpenRouter no aceptó la solicitud del modelo ${modelName} (HTTP 400). Comprueba compatibilidad y vuelve a intentarlo.${detail}${noFallback}`;
  }
  if (status >= 500) {
    return `El proveedor/modelo ${modelName} no está disponible temporalmente (HTTP ${status}). Los modelos gratuitos pueden tener cuotas o fallos intermitentes.${detail}${noFallback}`;
  }
  return `OpenRouter no pudo completar la solicitud para ${modelName} (HTTP ${status || "desconocido"}).${detail}${noFallback}`;
}
