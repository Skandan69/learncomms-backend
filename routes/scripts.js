const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/call-opening", async (req, res) => {
  try {
    const prompt = `
You are a workplace communication trainer.

Generate ONE professional call opening script for a customer support agent.

Rules:
- Spoken English
- Polite, calm, confident
- 1–2 sentences only
- Neutral global English
- No placeholders
- No emojis
- No explanations

Return ONLY the script text.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    res.json({ script: response.choices[0].message.content.trim() });

  } catch (err) {
    console.error("SCRIPT ERROR:", err);
    res.status(500).json({ error: "Failed to generate script" });
  }
});

module.exports = router;
