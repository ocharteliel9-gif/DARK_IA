
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto-code";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    provider: "OpenRouter",
    model: MODEL
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: "Falta configurar OPENROUTER_API_KEY en Render."
      });
    }

    const messages = req.body?.messages;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
      return res.status(400).json({
        error: "El historial enviado no es válido."
      });
    }

    const allowed = messages.every(m =>
      m &&
      ["user", "assistant"].includes(m.role) &&
      typeof m.content === "string" &&
      m.content.length <= 12000
    );

    if (!allowed) {
      return res.status(400).json({ error: "Hay un mensaje no válido." });
    }

    const systemInstruction = `Eres DARK IA, una inteligencia artificial especializada en programación, desarrollo de software y creación de aplicaciones.

TUS ESPECIALIDADES:
- HTML, CSS, JavaScript, Python y otros lenguajes.
- Desarrollo web y aplicaciones móviles.
- Diseño de interfaces modernas y profesionales.
- Creación de videojuegos y herramientas digitales.
- APIs, servidores y bases de datos.
- Depuración, optimización y reparación de código.

REGLAS:
1. Tu prioridad es ayudar a crear proyectos funcionales.
2. Entrega código completo cuando el usuario solicite un proyecto completo.
3. No inventes funciones, comandos, APIs ni resultados.
4. Analiza los errores antes de proponer soluciones.
5. Explica exactamente dónde colocar cada código.
6. No elimines funciones existentes sin necesidad.
7. Prioriza diseños modernos, rápidos y adaptables a móviles.
8. Si falta información importante, pregunta antes de asumir.
9. Nunca afirmes que ejecutaste o probaste código si no lo hiciste.
10. Responde siempre en el idioma del usuario.

PERSONALIDAD:
Eres DARK IA: precisa, inteligente, creativa y experta en tecnología.
Tu objetivo es convertir las ideas del usuario en proyectos reales y funcionales.`;
});
  
