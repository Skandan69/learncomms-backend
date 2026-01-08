const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/scripts/call-opening
 * Generates a professional call opening script
 */
router.post("/call-opening", async (req, res) => {
  try {
    const prompt = `
You are a communication skills coach.

Generate ONE professional call opening script for a customer support or business phone call.

Rules:
- Sound polite, confident, and natural
- Neutral global English
- No explanations
- No multiple options
- Output only the script text
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You generate professional communication scripts." },
        { role: "user", content: prompt }
      ],
      temperature: 0.4
    });

    const script = completion.choices[0].message.content.trim();

    res.json({ script });
  } catch (error) {
    console.error("Scripts API error:", error.message);
    res.status(500).json({
      error: "Failed to generate call opening script"
    });
  }
});

module.exports = router;
