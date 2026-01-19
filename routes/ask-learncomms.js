const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   Helpers
========================= */
function isBlockedTopic(text = "") {
  const t = String(text).toLowerCase();

  // Block truly irrelevant topics (not communication training)
  const blocked =
    /(politics|election|prime minister|cricket score|bitcoin price|stock price|latest news|instagram|movie|songs|celebrity|coding|javascript|python|java program|bug fix|server error|api code)/i;

  return blocked.test(t);
}

/* =========================
   ✅ Ask LearnComms API
========================= */
router.post("/ask-learncomms", async (req, res) => {
  try {
    const question = (req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "Question is required" });

    // ✅ hard safety block (fast filter)
    if (isBlockedTopic(question)) {
      return res.json({
        refused: true,
        message:
          "I’m Ask LearnComms. I help only with English learning, workplace/corporate communication, soft skills training, college communication, and IELTS preparation.\n\nTry asking:\n• Rewrite this email professionally\n• Correct my sentence and explain\n• Emotional intelligence training with activities\n• Non-verbal communication tips for interviews\n• Sales call roleplay script\n• IELTS Speaking Part 2 sample answer"
      });
    }

    const system = `
You are "Ask LearnComms" — a Communication + Corporate + Softskills Trainer Engine.

✅ Allowed scope (YOU MUST ANSWER these):
1) English learning:
- pronunciation, fluency, intonation, grammar, vocabulary, writing clarity

2) Workplace / corporate communication:
- calls, chats, emails, meetings, interviews, professional tone
- customer support communication, objection handling (communication part)
- conflict handling, escalation language, confidence speaking

3) Soft skills / behavioural skills:
- emotional intelligence, empathy, professionalism, teamwork
- leadership communication, active listening, assertiveness
- non-verbal communication (body language guidance)
- workplace etiquette and communication habits

4) College communication:
- presentations, group discussion, viva, interview practice, academic writing basics

5) IELTS:
- IELTS speaking coaching (Part 1/2/3)
- IELTS writing coaching (Task 1/2) – structure + vocabulary + sample answers

❌ Outside scope (REFUSE politely):
- politics/news/sports scores/crypto/stocks
- programming/coding/technical debugging
- entertainment gossip

Trainer behavior rules (IMPORTANT):
- Always answer like a TRAINER, not a generic chatbot.
- Always include: WHAT to do + WHY it works + HOW to practice.
- Provide roleplays / activities whenever relevant.
- Avoid long essays. Keep it structured and practical.
- Keep language simple, professional, and learner-friendly (India/Tier 2-3 friendly).
- If user asks “training content”, provide:
  • Session plan (20–60 min)
  • Trainer instructions
  • Activities (roleplay / quiz / drill)
  • Debrief questions

Return ONLY valid JSON in EXACT format (no markdown, no extra keys):

{
  "intent": "string",
  "answer": "string",
  "explanation": "string",
  "examples": ["..."],
  "drills": ["..."],
  "do_dont": ["..."],
  "roleplay": ["..."],
  "activityPlan": ["..."],
  "followups": ["..."]
}

Intent must be one of:
pronunciation | grammar | email | ielts_speaking | ielts_writing | corporate_speaking | softskills | nonverbal | customer_support | sales_communication | general
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
        answer: raw.slice(0, 1600),
        explanation: "",
        examples: [],
        drills: [],
        do_dont: [],
        roleplay: [],
        activityPlan: [],
        followups: []
      };
    }

    // ✅ ensure all fields exist (frontend safety)
    data.intent = data.intent || "general";
    data.answer = data.answer || "";
    data.explanation = data.explanation || "";
    data.examples = Array.isArray(data.examples) ? data.examples : [];
    data.drills = Array.isArray(data.drills) ? data.drills : [];
    data.do_dont = Array.isArray(data.do_dont) ? data.do_dont : [];
    data.roleplay = Array.isArray(data.roleplay) ? data.roleplay : [];
    data.activityPlan = Array.isArray(data.activityPlan) ? data.activityPlan : [];
    data.followups = Array.isArray(data.followups) ? data.followups : [];

    return res.json(data);

  } catch (err) {
    console.error("ASK LEARNCOMMS ERROR:", err);
    return res.status(500).json({ error: "Ask LearnComms failed" });
  }
});

module.exports = router;
