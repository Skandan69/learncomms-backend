const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/", async (req, res) => {
  try {
    const { text, channel = "chat", tone = "neutral" } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const prompt = `
You are a professional workplace writing assistant.

Task:
Rewrite the message below into THREE different versions.

Context:
- Channel: ${channel}
- Desired tone: ${tone}

Rules:
- Keep meaning intact
- Sound natural and professional
- Do NOT add explanations
- Do NOT label one as best
- Each version must be complete and usable

Return EXACTLY this format:

Version 1:
<text>

Version 2:
<text>

Version 3:
<text>

Message:
${text}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    const raw = completion.choices[0].message.content || "";

    const versions = raw
      .split(/Version \d:/)
      .map(v => v.trim())
      .filter(Boolean);

    res.json({ versions });

  } catch (err) {
    console.error("WRITING ASSISTANT ERROR:", err);
    res.status(500).json({ error: "Failed to generate writing suggestions" });
  }
});

module.exports = router;
