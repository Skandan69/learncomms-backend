const express = require("express");
const router = express.Router();

const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * QA AUDIT - TEXT INPUT
 * Body: { mode: "call|chat|email", text: "...", evaluatorName?, agentName? }
 */
router.post("/qa-audit-text", async (req, res) => {
  try {
    const { mode, text, evaluatorName, agentName } = req.body || {};

    if (!mode || !["call", "chat", "email"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode. Must be call/chat/email." });
    }
    if (!text || String(text).trim().length < 30) {
      return res.status(400).json({ error: "Text too short. Please paste complete transcript/chat/email." });
    }

    // We will request frontend user's QA Guide storage format.
    // For now backend uses internal fixed prompt logic.
    // (Later: can accept parameter config payload as well.)
    const SYSTEM = `
You are a strict QA auditor for customer support.
You MUST score based on the rubric and parameters provided.
You MUST output valid JSON only. No markdown, no commentary.
Your scoring is from 1 to 5 per parameter.
If evidence not found, score conservatively (2 or 3).
Avoid giving NA unless parameter is impossible to judge from text.
`;

    // Minimal baseline parameters (fallback)
    const fallbackParams = {
      call: {
        Language: ["Grammar", "Fluency", "Pronunciation Clarity", "Vocabulary"],
        "Soft Skills": ["Empathy", "Confidence", "Active Listening"],
        Process: ["Greeting & Closing", "Resolution", "Compliance"]
      },
      chat: {
        Language: ["Grammar", "Clarity", "Vocabulary"],
        "Soft Skills": ["Empathy", "Professional Tone"],
        Process: ["Resolution", "Ownership"]
      },
      email: {
        Language: ["Grammar", "Clarity", "Professional Writing"],
        "Soft Skills": ["Tone", "Customer Friendliness"],
        Process: ["Resolution", "Structure", "Next Steps"]
      }
    };

    const params = fallbackParams[mode];

    const USER = `
Mode: ${mode}
Evaluator Name: ${evaluatorName || ""}
Agent Name: ${agentName || ""}

Conversation/Email:
${text}

Parameters:
${JSON.stringify(params, null, 2)}

Rules:
- Score each parameter: 1-5
- Provide one reason per parameter using evidence.
- Provide finalScore out of 100 using NA-exclusion logic.
- Provide categoryScores: Language, Soft Skills, Process (percent)
- Provide errors list (5-10)
- Provide feedback list (5-10)
- Provide 7-day action plan (7 items)

Output JSON schema:
{
  "mode": "call|chat|email",
  "finalScore": 0-100,
  "categoryScores": { "Language": 0-100, "Soft Skills": 0-100, "Process": 0-100 },
  "parameterScores": [
    { "category":"Language", "parameter":"...", "score":1-5, "reason":"..." }
  ],
  "errors": ["..."],
  "feedback": ["..."],
  "actionPlan": [
    { "day":1, "task":"..." }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: USER }
      ],
      response_format: { type: "json_object" }
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ error: "AI returned invalid JSON.", raw });
    }

    return res.json(json);
  } catch (err) {
    console.error("QA audit error:", err);
    return res.status(500).json({ error: "QA audit failed", details: err.message });
  }
});

module.exports = router;
