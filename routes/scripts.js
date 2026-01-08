const express = require("express");
const OpenAI = require("openai");
const scriptsIntelligence = require("../intelligence/scriptsIntelligence");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ======================================================
   SCRIPTS V1 — CALL OPENING (INTELLIGENCE DRIVEN)
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

Generate ONE professional CALL OPENING script.

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance to maintain:
Empathy level: ${intelligence.strategyBalance.empathy}
Persuasion level: ${intelligence.strategyBalance.persuasion}
Authority level: ${intelligence.strategyBalance.authority}

Rules:
- Spoken English
- Polite, calm, confident
- 1–2 sentences only
- Neutral global English
- Human, non-robotic
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

    const script = response.choices[0].message.content.trim();

    res.json({
      primary: script
    });

  } catch (error) {
    console.error("CALL OPENING SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate call opening script" });
  }
});

module.exports = router;
