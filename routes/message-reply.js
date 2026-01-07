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
You are a professional communication assistant.

Task:
Suggest POSSIBLE replies to the message below.

Rules:
- Replies are suggestions, not instructions
- No judgement, no blame
- Keep tone respectful and professional
- Do NOT say "best reply"
- Provide multiple options

Context:
Channel: ${channel}
Desired tone: ${tone}

Provide EXACTLY 3 reply options.
Each reply should be short and practical.

Message:
${text}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    const raw = completion.choices[0].message.content || "";

    const replies = raw
      .split("\n")
      .map(r => r.trim())
      .filter(Boolean);

    res.json({ replies });

  } catch (err) {
    console.error("MESSAGE REPLY ERROR:", err);
    res.status(500).json({ error: "Failed to generate replies" });
  }
});

module.exports = router;

