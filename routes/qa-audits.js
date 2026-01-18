const express = require("express");
const router = express.Router();

const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ===============================
   HELPERS
================================ */
function sanitizeParamsForMode(paramsState, mode) {
  const modeObj = paramsState?.[mode] || {};
  const out = {
    Language: Array.isArray(modeObj.Language) ? modeObj.Language : [],
    "Soft Skills": Array.isArray(modeObj["Soft Skills"]) ? modeObj["Soft Skills"] : [],
    Process: Array.isArray(modeObj.Process) ? modeObj.Process : []
  };

  for (const k of Object.keys(out)) {
    out[k] = out[k].map(x => String(x || "").trim()).filter(Boolean);
  }

  return out;
}

function getRubricForParam(rubricsState, mode, paramName) {
  const modeRubrics = rubricsState?.[mode] || {};
  const r = modeRubrics?.[paramName] || null;
  return r;
}

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/* ===============================
   ROUTE
================================ */
router.post("/qa-audit-text", async (req, res) => {
  try {
    const {
      mode,
      text,
      evaluatorName,
      agentName,
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
        Language: ["Grammar", "Fluency", "Pronunciation", "Vocabulary / Word choice"],
        "Soft Skills": ["Empathy / Reassurance", "Active Listening", "Closing (recap + next steps + confirm resolution)"],
        Process: ["Resolution accuracy", "Process adherence / compliance"]
      },
      chat: {
        Language: ["Grammar", "Sentence clarity (simple English)", "Tone / professional wording"],
        "Soft Skills": ["Empathy & acknowledgement", "Ownership & accountability"],
        Process: ["Resolution accuracy", "Documentation / internal notes quality"]
      },
      email: {
        Language: ["Grammar accuracy", "Clarity & simplicity", "Tone in writing (polite positive)"],
        "Soft Skills": ["Subject line quality", "Empathy / acknowledgement", "Closing & next steps"],
        Process: ["Next Steps"]
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

    // ✅ Build strict allowed list of params (WHITELIST)
    const allowedParamsByCategory = {
      Language: paramsForMode.Language || [],
      "Soft Skills": paramsForMode["Soft Skills"] || [],
      Process: paramsForMode.Process || []
    };

    const allowedAllParams = [
      ...allowedParamsByCategory.Language,
      ...allowedParamsByCategory["Soft Skills"],
      ...allowedParamsByCategory.Process
    ];

    // map normalized -> exact param name
    const allowedMap = {};
    allowedAllParams.forEach(p => {
      allowedMap[norm(p)] = p;
    });

    // Build rubric bundle for current mode
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

ABSOLUTE RULES:
1) You MUST score ONLY the provided parameters.
2) You MUST use parameter names EXACTLY as given in the allowed list.
   - Do not rename
   - Do not shorten
   - Do not reword
3) Score each parameter from 1 to 5.
4) Use evidence from the conversation/email.
5) If evidence is missing, score conservatively (2 or 3) and explain why.
6) Return valid JSON only.
`;

    const USER = `
Mode: ${mode}
Evaluator Name: ${evaluatorName || ""}
Agent Name: ${agentName || ""}

Conversation/Email:
${text}

ALLOWED PARAMETERS BY CATEGORY (use these exact strings only):
${JSON.stringify(allowedParamsByCategory, null, 2)}

RUBRICS:
${JSON.stringify(rubricBundle, null, 2)}

OUTPUT REQUIREMENTS:
- You must return parameterScores for ALL allowed parameters (no skipping).
- Each parameter object must contain:
  category, parameter, score, reason
- "parameter" MUST EXACTLY match one string from the allowed list.

Scoring rules:
- category% = (sum(scores)/ (count * 5)) * 100
- finalScore% = (sum(all scores)/ (total count * 5)) * 100
- Round percentages to nearest whole number.

Output JSON schema EXACT:
{
  "mode": "call|chat|email",
  "finalScore": 0,
  "categoryScores": { "Language": 0, "Soft Skills": 0, "Process": 0 },
  "parameterScores": [
    { "category":"Language", "parameter":"...", "score":1, "reason":"..." }
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
        { role: "system", content: SYSTEM.trim() },
        { role: "user", content: USER.trim() }
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

    // ✅ SERVER SIDE VALIDATION + AUTO-FIX PARAM NAMES
    // If model slightly changes names ("Clarity" etc.), normalize and map.
    const fixed = [];
    const invalid = [];

    const ps = Array.isArray(json.parameterScores) ? json.parameterScores : [];

    for (const item of ps) {
      const cat = item.category;
      const paramRaw = item.parameter;
      const score = Number(item.score);

      if (!cat || !paramRaw) continue;

      const mapped = allowedMap[norm(paramRaw)];
      if (!mapped) {
        invalid.push(paramRaw);
        continue;
      }

      fixed.push({
        category: cat,
        parameter: mapped, // ✅ exact param name
        score: score >= 1 && score <= 5 ? score : 3,
        reason: String(item.reason || "").trim().slice(0, 250)
      });
    }

    // ✅ Ensure all allowed params exist in output
    // If missing, add default conservative scores
    const existingSet = new Set(fixed.map(x => norm(x.parameter)));

    for (const category of ["Language", "Soft Skills", "Process"]) {
      for (const param of allowedParamsByCategory[category]) {
        if (!existingSet.has(norm(param))) {
          fixed.push({
            category,
            parameter: param,
            score: 3,
            reason: "Evidence is limited/unclear in the provided text, so a neutral score is given."
          });
        }
      }
    }

    json.parameterScores = fixed;

    // ✅ Add debug meta
    json.meta = {
      usingGuide,
      invalidParamsReturnedByAI: invalid,
      paramsCount: {
        Language: allowedParamsByCategory.Language.length,
        "Soft Skills": allowedParamsByCategory["Soft Skills"].length,
        Process: allowedParamsByCategory.Process.length
      }
    };

    return res.json(json);

  } catch (err) {
    console.error("QA audit error:", err);
    return res.status(500).json({ error: "QA audit failed", details: err.message });
  }
});

module.exports = router;
