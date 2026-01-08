const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/call-opening", async (req, res) => {
  try {
    const prompt = `
You are an expert workplace communication coach.

Generate THREE DIFFERENT call opening scripts for a CUSTOMER SUPPORT phone call.

Each script must follow a different communication strategy:

SCRIPT A — Empathy-first:
- Warm, calming, emotionally validating
- Reassures the caller
- Reduces tension immediately

SCRIPT B — Balanced professional:
- Neutral, clear, confident
- Standard professional tone
- Safe for any workplace

SCRIPT C — Confident & persuasive:
- Confident, authoritative but polite
- Builds trust and credibility
- Leads the conversation forward

STRICT RULES:
- Spoken English only
- 1–2 sentences per script
- No placeholders
- No emojis
- No explanations
- Output ONLY the scripts

FORMAT EXACTLY LIKE THIS:

SCRIPT A:
<text>

SCRIPT B:
<text>

SCRIPT C:
<text>
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5
    });

    const content = response.choices[0].message.content;

    const extract = (label) => {
      const match = content.match(
        new RegExp(`${label}:([\\s\\S]*?)(?=SCRIPT [ABC]:|$)`)
      );
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("SCRIPT A"),
      alternative1: extract("SCRIPT B"),
      alternative2: extract("SCRIPT C")
    });

  } catch (err) {
    console.error("SCRIPT GENERATION ERROR:", err);
    res.status(500).json({ error: "Failed to generate scripts" });
  }
});

module.exports = router;
