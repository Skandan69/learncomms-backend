const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const prompt = `
You are a communication clarity assistant.

Your role is to HELP the reader understand a message or conversation.
You must NOT judge, blame, or take sides.

Rules:
- Use neutral, non-absolute language
- Use words like "likely", "may", "possibly"
- Do NOT say who is right or wrong
- Do NOT give advice unless asked

Analyze the message and respond in EXACTLY this format:

Likely intent:
<one or two sentences>

Emotional tone:
<one or two words or a short phrase>

What the sender is focusing on:
<one short sentence>

What this message is NOT:
<one short sentence>

Message:
${text}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    });

    const output = completion.choices[0].message.content || "";

    const lines = output
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    let likelyIntent = "";
    let tone = "";
    let focus = "";
    let notIntent = "";
    let section = "";

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (lower.startsWith("likely intent")) {
        section = "intent";
        continue;
      }
      if (lower.startsWith("emotional tone")) {
        section = "tone";
        continue;
      }
      if (lower.startsWith("what the sender is focusing on")) {
        section = "focus";
        continue;
      }
      if (lower.startsWith("what this message is not")) {
        section = "not";
        continue;
      }

      if (section === "intent") likelyIntent += (likelyIntent ? " " : "") + line;
      if (section === "tone") tone += (tone ? " " : "") + line;
      if (section === "focus") focus += (focus ? " " : "") + line;
      if (section === "not") notIntent += (notIntent ? " " : "") + line;
    }

    res.json({
      likelyIntent,
      tone,
      focus,
      notIntent
    });

  } catch (err) {
    console.error("MESSAGE DECODE ERROR:", err);
    res.status(500).json({ error: "Failed to decode message" });
  }
});

module.exports = router;

