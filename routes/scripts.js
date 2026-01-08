const express = require("express");
const OpenAI = require("openai");
const scriptsIntelligence = require("../intelligence/scriptsIntelligence");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ======================================================
   SCRIPTS — CALL OPENING (PRIMARY + ALTERNATIVES)
====================================================== */
router.post("/call-opening", async (req, res) => {
  try {
    const {
      category = "callOpening",
      type = "default"
    } = req.body;

    // 🧠 Load intelligence safely
    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const prompt = `
You are a workplace communication trainer.

Generate THREE DIFFERENT call opening scripts.

Script 1: Primary (best balanced)
Script 2: Alternative (slightly warmer)
Script 3: Alternative (slightly more confident)

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

Rules:
- Spoken English
- Polite, calm, confident
- Each script: 1–2 sentences only
- Neutral global English
- Human, non-robotic
- No placeholders
- No emojis
- No explanations

Return output in EXACT format:

Primary:
<text>

Alternative 1:
<text>

Alternative 2:
<text>
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.45
    });

    const raw = response.choices[0].message.content;

    // 🧼 Safe parsing
    const extract = (label) => {
      const match = raw.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`));
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("Primary"),
      alternative1: extract("Alternative 1"),
      alternative2: extract("Alternative 2")
    });

  } catch (error) {
    console.error("CALL OPENING SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate call opening scripts" });
  }
});

module.exports = router;
