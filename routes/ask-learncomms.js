const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ Ask LearnComms API
router.post("/ask-learncomms", async (req, res) => {
  try {
    const question = (req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "Question is required" });

    // ✅ hard scope safety block (fast filter)
    const blocked =
      /(politics|election|prime minister|cricket|bitcoin|coding|javascript|python|news|instagram|movie|songs)/i;

    if (blocked.test(question)) {
      return res.json({
        refused: true,
        message:
          "I’m Ask LearnComms. I only help with English learning, corporate/college communication, and IELTS preparation.\n\nTry asking:\n• Rewrite this email professionally\n• Correct my sentence and explain\n• IELTS Speaking Part 2 sample\n• Pronunciation drills for /v/ and /w/"
      });
    }

    const system = `
You are "Ask LearnComms" — an English & Communication Trainer.

Allowed scope ONLY:
- English learning: pronunciation, fluency, grammar, vocabulary, intonation, writing
- Workplace/corporate communication: calls, chats, emails, meetings, confidence
- College communication: presentations, interview prep, group discussion
- IELTS speaking/writing coaching

STRICT RULES:
- If topic is outside scope: refuse politely and redirect to allowed topics.
- Always respond like a trainer.
- Avoid long essays. Keep it structured.
- Provide practical examples & drills.

Return ONLY valid JSON in this EXACT format:

{
  "intent": "string",
  "answer": "string",
  "explanation": "string",
  "examples": ["..."],
  "drills": ["..."],
  "do_dont": ["..."],
  "followups": ["..."]
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: question }
      ],
      temperature: 0.4
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "{}";

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      // ✅ fallback if model returns non-json
      data = {
        intent: "general",
        answer: raw.slice(0, 1500),
        explanation: "",
        examples: [],
        drills: [],
        do_dont: [],
        followups: []
      };
    }

    return res.json(data);

  } catch (err) {
    console.error("ASK LEARNCOMMS ERROR:", err);
    return res.status(500).json({ error: "Ask LearnComms failed" });
  }
});

module.exports = router;
