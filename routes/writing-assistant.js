const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/", async (req, res) => {
  try {
    const { text, channel = "chat", tone = "neutral" } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const prompt = `
You are a professional workplace writing assistant.

Task:
Rewrite the message below into THREE different versions.

Context:
- Channel: ${channel}
- Desired tone: ${tone}

Message:
${text}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    const raw = response.choices[0].message.content.trim();

    const versions = raw
      .split(/\n{2,}/)
      .map(v => v.replace(/^Version \d+:\s*/i, "").trim())
      .filter(Boolean);

    res.json({ versions });

  } catch (err) {
    console.error("WRITING ASSISTANT ERROR:", err);
    res.status(500).json({ error: "Writing assistant failed" });
  }
});

module.exports = router;
