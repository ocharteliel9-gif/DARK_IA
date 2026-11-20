import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "degemini-3.8-flash";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (_req, res) => {
  res.json({ ok: true, configured: Boolean(process.env.GEMINI_API_KEY) });
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "Falta configurar GEMINI_API_KEY en las variables de entorno del servidor."
      });
    }

    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
      return res.status(400).json({ error: "El historial enviado no es válido." });
    }

    const allowed = messages.every(m =>
      m && ["user", "assistant"].includes(m.role) &&
      typeof m.content === "string" && m.content.length <= 12000
    );
    if (!allowed) return res.status(400).json({ error: "Hay un mensaje no válido." });

    const systemInstruction = `Eres DARK IA, un asistente de inteligencia artificial útil, claro y responsable.
Tu función es ayudar con conversación, aprendizaje, programación, creación y depuración de código,
ideas, escritura y tecnología. Responde en el idioma del usuario. Cuando programes, entrega código
completo y explica dónde colocarlo. No afirmes que ejecutaste, publicaste o verificaste algo si no lo hiciste.
Si falta información importante, pregunta de forma concreta. Sé honesto sobre límites y errores.
No solicites contraseñas, claves privadas ni datos sensibles.`;

    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || "El proveedor de IA devolvió un error.";
      return res.status(response.status).json({ error: message });
    }

    const answer = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "").join("").trim();

    if (!answer) return res.status(502).json({ error: "La IA no devolvió una respuesta. Inténtalo otra vez." });
    res.json({ answer });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "No se pudo conectar con DARK IA. Revisa tu conexión e inténtalo otra vez." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`DARK IA está activa en el puerto ${PORT}`);
});
