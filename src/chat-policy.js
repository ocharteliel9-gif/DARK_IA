export const PERSONALITIES = Object.freeze({
  professional: "Mantén un tono profesional, claro y respetuoso.",
  cheerful: "Sé cálida, optimista y expresiva. Celebra los avances y usa humor ligero cuando encaje; conserva la honestidad y precisión, sin exagerar ni infantilizar.",
  direct: "Usa un tono frío, sobrio y conciso. Ve al punto y nombra los problemas con franqueza; conserva el respeto, evita insultos y declara la incertidumbre.",
  friendly: "Mantén un tono amable, cercano y paciente.",
  creative: "Usa un tono creativo y original sin sacrificar precisión.",
  teacher: "Actúa como docente paciente y explica de forma gradual con ejemplos."
});

export const EMOJI_INSTRUCTIONS = Object.freeze({
  none: "No uses ningún emoji, sticker ni emoticono.",
  low: "Usa como máximo 3 emojis por respuesta completa y solo cuando encajen; no superes ese límite.",
  medium: "Usa emojis de forma moderada: normalmente 3–5 en respuestas largas y menos en respuestas breves, siempre menos que en el nivel Usar siempre.",
  always: "Usa emojis con frecuencia y entusiasmo: normalmente 6–10 en respuestas largas e incluye al menos uno en respuestas breves. No los insertes en código, URL o citas, ni satures cada frase."
});

export const EXACT_GREETING = "Hola soy una IA creada por vip modifier un creador de aplicaciones para el rendimiento no tan conocido";

export function isExactGreeting(value) {
  return typeof value === "string" && value.trim().toLocaleLowerCase("es") === "hola";
}

export function isValidAssistantPreferences(personality, emojiLevel, useSources) {
  return Object.hasOwn(PERSONALITIES, personality) &&
    Object.hasOwn(EMOJI_INSTRUCTIONS, emojiLevel) &&
    typeof useSources === "boolean";
}
