const express = require("express");
const router = express.Router();

const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sanitizeParamsForMode(paramsState, mode) {
  const modeObj = paramsState?.[mode] || {};
  const out = {
    Language: Array.isArray(modeObj.Language) ? modeObj.Language : [],
    "Soft Skills": Array.isArray(modeObj["Soft Skills"]) ? modeObj["Soft Skills"] : [],
    Process: Array.isArray(modeObj.Process) ? modeObj.Process : []
  };

  // remove empty strings
  for (const k of Object.keys(out)) {
    out[k] = out[k].map(x => String(x || "").trim()).filter(Boolean);
  }

  return out;
}

function getRubricForParam(rubricsState, mode, paramName) {
  // expected:
  // rubricsState[mode][paramName] = { "5":"...", "4":"...", ... "1":"..." }
  const modeRubrics = rubricsState?.[mode] || {};
  const r = modeRubrics?.[paramName] || null;
  return r;
}

router.post("/qa-audit-text", async (req, res) => {
  try {
    const {
      mode,
      text,
      evaluatorName,
      agentName,

      // ✅ coming from audits.js
      paramsState,
      rubricsState
    } = req.body || {};

    if (!mode || !["call", "chat", "email"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode. Must be call/chat/email." });
    }
    if (!text || String(text).trim().length < 30) {
      return res.status(400).json({ error: "Text too short. Please paste complete transcript/chat/email." });
    }

    // Fallback params (if guide not sent)
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

    // ✅ Use guide-based params if available
    let paramsForMode = fallbackParams[mode];
    let usingGuide = false;

    if (paramsState && typeof paramsState === "object") {
      const sanitized = sanitizeParamsForMode(paramsState, mode);
      const count =
        sanitized.Language.length +
        sanitized["Soft Skills"].length +
        sanitized.Process.length;

      if (count >= 3) {
        paramsForMode = sanitized;
        usingGuide = true;
      }
    }

    // Build rubric bundle for current mode
    // We give AI *exact score meaning* for every parameter (1-5)
    let rubricBundle = {};
    if (usingGuide && rubricsState && typeof rubricsState === "object") {
      for (const category of ["Language", "Soft Skills", "Process"]) {
        for (const param of paramsForMode[category] || []) {
          const r = getRubricForParam(rubricsState, mode, param);
          if (r) rubricBundle[param] = r;
        }
      }
    }

    const SYSTEM = `
You are a strict QA auditor for customer support communication.

CRITICAL:
- You MUST follow the provided parameters and rubrics only.
- Score each parameter from 1 to 5.
- Do not invent parameters.
- Do not change rubric meaning.
- Use evidence from the conversation/email.
- Return valid JSON only (no markdown, no extra text).
- If evidence is missing for a parameter, score conservatively (2 or 3) and explain why.
- Avoid NA unless it is impossible to judge from text.
`;

    const USER = `
Mode: ${mode}
Evaluator Name: ${evaluatorName || ""}
Agent Name: ${agentName || ""}

Conversation/Email:
${text}

Parameters:
${JSON.stringify(paramsForMode, null, 2)}

Rubrics (score meanings for parameters):
${JSON.stringify(rubricBundle, null, 2)}

Scoring rules:
- Score each parameter: 1–5 (integer)
- Provide a reason per parameter (1–2 lines, evidence-based)
- Calculate category scores as percentage:
  category% = (sum(scores)/ (count * 5)) * 100
- Calculate finalScore:
  finalScore% = (sum(all scores)/ (total count * 5)) * 100
- Round percentages to nearest whole number.

Output JSON schema EXACT:
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

    // Add helpful debug metadata (optional)
    json.meta = {
      usingGuide,
      paramsCount: {
        Language: paramsForMode.Language.length,
        "Soft Skills": paramsForMode["Soft Skills"].length,
        Process: paramsForMode.Process.length
      }
    };

    return res.json(json);
  } catch (err) {
    console.error("QA audit error:", err);
    return res.status(500).json({ error: "QA audit failed", details: err.message });
  }
});

module.exports = router;
