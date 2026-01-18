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

  // remove empty strings
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

function clampScore(n) {
  const x = Number(n);
  if (!x || x < 1) return 1;
  if (x > 5) return 5;
  return Math.round(x);
}

/* ===============================
   SCORE RECOMPUTE
================================ */
function computePercent(scoreList) {
  // scoreList = [1..5]
  if (!scoreList.length) return 0;
  const sum = scoreList.reduce((a, b) => a + b, 0);
  const max = scoreList.length * 5;
  return Math.round((sum / max) * 100);
}

function recomputeScores(parameterScores, allowedByCategory) {
  const categoryScores = { Language: 0, "Soft Skills": 0, Process: 0 };

  const langScores = [];
  const softScores = [];
  const procScores = [];

  parameterScores.forEach(item => {
    const cat = item.category;
    if (cat === "Language") langScores.push(item.score);
    else if (cat === "Soft Skills") softScores.push(item.score);
    else if (cat === "Process") procScores.push(item.score);
  });

  categoryScores.Language = computePercent(langScores);
  categoryScores["Soft Skills"] = computePercent(softScores);
  categoryScores.Process = computePercent(procScores);

  const all = [...langScores, ...softScores, ...procScores];
  const finalScore = computePercent(all);

  return { finalScore, categoryScores };
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

    /* ===============================
       FALLBACK PARAMS
    ================================ */
    const fallbackParams = {
      call: {
        Language: ["Grammar", "Fluency", "Pronunciation", "Vocabulary / Word choice"],
        "Soft Skills": ["Empathy / Reassurance", "Active Listening", "Closing (recap + next steps + confirm resolution)"],
        Process: ["Resolution accuracy", "Process adherence / compliance"]
      },
      chat: {
        Language: ["Grammar", "Sentence clarity (simple English)", "Spelling", "Punctuation", "Tone / professional wording"],
        "Soft Skills": ["Greeting & opening", "Empathy & acknowledgement", "Ownership & accountability"],
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

    /* ===============================
       WHITELIST (ALLOWED PARAMS)
    ================================ */
    const allowedByCategory = {
      Language: paramsForMode.Language || [],
      "Soft Skills": paramsForMode["Soft Skills"] || [],
      Process: paramsForMode.Process || []
    };

    const allowedAll = [
      ...allowedByCategory.Language,
      ...allowedByCategory["Soft Skills"],
      ...allowedByCategory.Process
    ];

    // normalized->exact param name
    const allowedMap = {};
    allowedAll.forEach(p => {
      allowedMap[norm(p)] = p;
    });

    /* ===============================
       RUBRIC BUNDLE
    ================================ */
    let rubricBundle = {};
    if (usingGuide && rubricsState && typeof rubricsState === "object") {
      for (const category of ["Language", "Soft Skills", "Process"]) {
        for (const param of allowedByCategory[category] || []) {
          const r = getRubricForParam(rubricsState, mode, param);
          if (r) rubricBundle[param] = r;
        }
      }
    }

    /* ===============================
       PROMPT
    ================================ */
    const SYSTEM = `
You are a strict QA auditor for customer support communication.

ABSOLUTE RULES:
- You MUST score ONLY the provided parameters.
- You MUST use parameter names EXACTLY as given.
- Do NOT rename/rephrase/shorten parameters.
- Score each parameter 1 to 5.
- Use evidence from the conversation/email.
- If evidence is missing, score conservatively (2 or 3) and explain why.
- Return valid JSON only.
    `.trim();

    const USER = `
Mode: ${mode}
Evaluator Name: ${evaluatorName || ""}
Agent Name: ${agentName || ""}

Conversation/Email:
${text}

ALLOWED PARAMETERS BY CATEGORY (use exact strings):
${JSON.stringify(allowedByCategory, null, 2)}

RUBRICS:
${JSON.stringify(rubricBundle, null, 2)}

OUTPUT REQUIREMENTS:
- parameterScores MUST include ALL allowed parameters (no skipping).
- Each parameter entry includes: category, parameter, score, reason.
- Score must be integer 1-5.

Return ONLY JSON in this schema:
{
  "mode": "call|chat|email",
  "parameterScores": [
    { "category":"Language", "parameter":"...", "score":1, "reason":"..." }
  ],
  "errors": ["..."],
  "feedback": ["..."],
  "actionPlan": [
    { "day":1, "task":"..." }
  ]
}
    `.trim();

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

    let aiJson;
    try {
      aiJson = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ error: "AI returned invalid JSON.", raw });
    }

    /* ===============================
       SERVER FIX-UP (MAKE PERFECT)
    ================================ */
    const invalidParamsReturnedByAI = [];
    const fixed = [];

    const input = Array.isArray(aiJson.parameterScores) ? aiJson.parameterScores : [];

    for (const item of input) {
      const category = String(item.category || "").trim();
      const paramRaw = String(item.parameter || "").trim();
      const reason = String(item.reason || "").trim();

      const mapped = allowedMap[norm(paramRaw)];
      if (!mapped) {
        invalidParamsReturnedByAI.push(paramRaw);
        continue;
      }

      // ✅ force valid category (must be one of 3)
      let finalCategory = category;
      if (!["Language", "Soft Skills", "Process"].includes(finalCategory)) {
        // try infer category from allowed lists
        if (allowedByCategory.Language.includes(mapped)) finalCategory = "Language";
        else if (allowedByCategory["Soft Skills"].includes(mapped)) finalCategory = "Soft Skills";
        else finalCategory = "Process";
      }

      fixed.push({
        category: finalCategory,
        parameter: mapped,
        score: clampScore(item.score),
        reason: reason.slice(0, 280)
      });
    }

    // ✅ Ensure ALL allowed params exist
    const existing = new Set(fixed.map(x => norm(x.parameter)));

    for (const category of ["Language", "Soft Skills", "Process"]) {
      for (const param of allowedByCategory[category] || []) {
        if (!existing.has(norm(param))) {
          fixed.push({
            category,
            parameter: param,
            score: 3,
            reason: "Evidence is limited/unclear in the provided text, so a neutral score is given."
          });
        }
      }
    }

    // ✅ sort output exactly by category order + param order
    const orderCategory = ["Language", "Soft Skills", "Process"];
    const idxParam = {};
    orderCategory.forEach(cat => {
      (allowedByCategory[cat] || []).forEach((p, i) => {
        idxParam[norm(p)] = i;
      });
    });

    fixed.sort((a, b) => {
      const ca = orderCategory.indexOf(a.category);
      const cb = orderCategory.indexOf(b.category);
      if (ca !== cb) return ca - cb;
      return (idxParam[norm(a.parameter)] ?? 9999) - (idxParam[norm(b.parameter)] ?? 9999);
    });

    // ✅ recompute finalScore + categoryScores server-side
    const { finalScore, categoryScores } = recomputeScores(fixed, allowedByCategory);

    /* ===============================
       FINAL OUTPUT
    ================================ */
    const output = {
      mode,
      finalScore,
      categoryScores,
      parameterScores: fixed,
      errors: Array.isArray(aiJson.errors) ? aiJson.errors.slice(0, 15) : [],
      feedback: Array.isArray(aiJson.feedback) ? aiJson.feedback.slice(0, 10) : [],
      actionPlan: Array.isArray(aiJson.actionPlan) ? aiJson.actionPlan.slice(0, 7) : [],
      meta: {
        usingGuide,
        invalidParamsReturnedByAI,
        paramsCount: {
          Language: allowedByCategory.Language.length,
          "Soft Skills": allowedByCategory["Soft Skills"].length,
          Process: allowedByCategory.Process.length
        }
      }
    };

    return res.json(output);

  } catch (err) {
    console.error("QA audit error:", err);
    return res.status(500).json({ error: "QA audit failed", details: err.message });
  }
});

module.exports = router;
