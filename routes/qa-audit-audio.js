const express = require("express");
const router = express.Router();

const multer = require("multer");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* =========================
   MULTER (memory upload)
========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

/* =========================
   HELPERS
========================= */
function safeText(s) {
  return String(s || "").trim();
}

function safeJSONParse(s, fallback = {}) {
  try {
    if (!s) return fallback;
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function sanitizeParamsForMode(paramsState, mode) {
  // QA Guide stores keys: language/soft/process in your QA Sheet
  // We'll convert to AI-friendly keys Language / Soft Skills / Process
  const modeObj = paramsState?.[mode] || {};

  const out = {
    Language: Array.isArray(modeObj.language) ? modeObj.language : [],
    "Soft Skills": Array.isArray(modeObj.soft) ? modeObj.soft : [],
    Process: Array.isArray(modeObj.process) ? modeObj.process : []
  };

  for (const k of Object.keys(out)) {
    out[k] = out[k].map(x => String(x || "").trim()).filter(Boolean);
  }

  return out;
}

function getRubricForParam(rubricsState, mode, paramName) {
  // rubricsState[mode][paramName] = { "5":"...", "4":"...", ... "1":"..." }
  const modeRubrics = rubricsState?.[mode] || {};
  return modeRubrics?.[paramName] || null;
}

/* =========================
   ROUTE: /api/qa-audit-audio
   Upload-only: audio -> transcript -> audit scoring using guide
========================= */
router.post("/qa-audit-audio", upload.single("audio"), async (req, res) => {
  try {
    const { toFile } = require("openai");

    const mode = safeText(req.body.mode || "call").toLowerCase();
    const evaluatorName = safeText(req.body.evaluatorName || "");
    const agentName = safeText(req.body.agentName || "");

    // paramsState/rubricsState come as STRING (FormData)
    const paramsState = safeJSONParse(req.body.paramsState, null);
    const rubricsState = safeJSONParse(req.body.rubricsState, null);

    if (mode !== "call") {
      return res.status(400).json({ error: "Audio audit currently supports only call mode." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Audio file is required (field name must be 'audio')." });
    }

    // ✅ Convert buffer -> file (OpenAI SDK expects File)
    const audioFile = await toFile(req.file.buffer, req.file.originalname || "call.webm");

    /* =========================
       1) TRANSCRIBE AUDIO
    ========================= */
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe"
    });

    const transcript = safeText(transcription.text);

    if (!transcript) {
      return res.json({
        mode: "call",
        transcript: "",
        finalScore: 0,
        categoryScores: { "Language": 0, "Soft Skills": 0, "Process": 0 },
        parameterScores: [],
        errors: ["Speech not detected clearly. Please upload again in a quiet environment."],
        feedback: ["Audio quality may be too low. Try recording again closer to the mic."],
        actionPlan: [
          { day: 1, task: "Record again with clear voice and low background noise." },
          { day: 2, task: "Speak slowly and clearly (avoid speaking too fast)." }
        ],
        meta: { usingGuide: false }
      });
    }

    /* =========================
       2) BUILD PARAMS FROM QA GUIDE
    ========================= */
    const fallbackParams = {
      call: {
        Language: ["Grammar", "Fluency", "Pronunciation", "Vocabulary"],
        "Soft Skills": ["Greeting & Opening", "Empathy", "Ownership", "Listening"],
        Process: ["Resolution accuracy", "Compliance", "Closing & next steps"]
      }
    };

    let paramsForMode = fallbackParams.call;
    let usingGuide = false;

    if (paramsState && typeof paramsState === "object") {
      const sanitized = sanitizeParamsForMode(paramsState, "call");
      const count =
        (sanitized.Language?.length || 0) +
        (sanitized["Soft Skills"]?.length || 0) +
        (sanitized.Process?.length || 0);

      if (count >= 3) {
        paramsForMode = sanitized;
        usingGuide = true;
      }
    }

    // bundle rubrics (only for params)
    let rubricBundle = {};
    if (usingGuide && rubricsState && typeof rubricsState === "object") {
      for (const category of ["Language", "Soft Skills", "Process"]) {
        for (const param of paramsForMode[category] || []) {
          const r = getRubricForParam(rubricsState, "call", param);
          if (r) rubricBundle[param] = r;
        }
      }
    }

    /* =========================
       3) SCORE USING GPT (STRICT)
    ========================= */
    const SYSTEM = `
You are a strict QA evaluator for customer support calls.

CRITICAL RULES:
- Follow provided Parameters strictly.
- If Rubrics exist for a parameter, you MUST follow the rubric meanings exactly.
- Score each parameter 1–5 integer.
- Do NOT invent parameters.
- Do NOT add extra fields.
- Return valid JSON only.
- Accent must NOT be penalized; focus on clarity and professionalism.
`;

    const USER = `
Mode: call
Evaluator Name: ${evaluatorName}
Agent Name: ${agentName}

Call Transcript:
${transcript}

Parameters:
${JSON.stringify(paramsForMode, null, 2)}

Rubrics (if provided for some parameters):
${JSON.stringify(rubricBundle, null, 2)}

Scoring rules:
- Score each parameter: 1–5 (integer)
- Provide a reason per parameter (evidence-based, 1–2 lines)
- Category score % = (sum(scores)/(count*5))*100
- finalScore % = (sum(all scores)/(total*5))*100
- Round all % to nearest whole number.

Output JSON schema EXACT:
{
  "mode": "call",
  "transcript": "",
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

    // ✅ Always attach real transcript
    json.transcript = transcript;

    // ✅ Helpful meta
    json.meta = {
      usingGuide,
      receivedAudioName: req.file.originalname,
      sizeBytes: req.file.size,
      paramsCount: {
        Language: paramsForMode.Language.length,
        "Soft Skills": paramsForMode["Soft Skills"].length,
        Process: paramsForMode.Process.length
      }
    };

    return res.json(json);

  } catch (err) {
    console.error("QA AUDIO AUDIT ERROR:", err);
    return res.status(500).json({
      error: "QA audio audit failed",
      details: err.message
    });
  }
});

module.exports = router;
