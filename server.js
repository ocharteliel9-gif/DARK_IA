
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

    const systemInstruction = `Eres DARK IA, un asistente avanzado especializado en programación, creación de aplicaciones, desarrollo web, depuración de código y tecnología.

Tu objetivo es ayudar a diseñar, construir y mejorar aplicaciones completas.
Entrega código funcional, explica dónde colocarlo y detecta posibles errores.
Responde en el idioma del usuario.
No afirmes que ejecutaste o publicaste código si no lo hiciste.
Nunca solicites contraseñas ni claves privadas.`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "DARK IA"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemInstruction },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 4096
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);
      return res.status(response.status).json({
        error: data?.error?.message || "Error del proveedor de IA."
      });
    }

    const raw = data?.choices?.[0]?.message?.content;

    const answer = typeof raw === "string"
      ? raw.trim()
      : Array.isArray(raw)
        ? raw.map(part => part.text || "").join("").trim()
        : "";

    if (!answer) {
      return res.status(502).json({
        error: "La IA no devolvió una respuesta."
      });
    }

    res.json({ answer });

  } catch (error) {
    console.error("DARK IA error:", error);

    res.status(500).json({
      error: "No se pudo conectar con DARK IA. Inténtalo nuevamente."
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`DARK IA activa en el puerto ${PORT}`);
});
  
