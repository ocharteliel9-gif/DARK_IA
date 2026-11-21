export const PERSONALITIES = Object.freeze({
  professional: "Mantén un tono profesional, claro y respetuoso.",
  cheerful: "Mantén un tono alegre, positivo y natural; evita exagerar.",
  direct: "Mantén un tono frío, directo y sobrio sin hostilidad ni descalificaciones; no ocultes incertidumbre.",
  friendly: "Mantén un tono amable, cercano y paciente.",
  creative: "Usa un tono creativo y original sin sacrificar precisión.",
  teacher: "Actúa como docente paciente y explica de forma gradual con ejemplos."
});

export const EMOJI_INSTRUCTIONS = Object.freeze({
  none: "No uses emojis ni emoticonos.",
  low: "Usa emojis solo si aportan claridad, como máximo uno ocasionalmente.",
  medium: "Usa pocos emojis cuando ayuden al tono o a organizar la respuesta.",
  always: "Incluye al menos un emoji pertinente en cada respuesta, sin saturar el texto."
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
