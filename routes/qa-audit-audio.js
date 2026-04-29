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
     /* =========================
   1.5) LABEL SPEAKERS (CRITICAL FIX)
========================= */

const labelingPrompt = `
Convert the following call transcript into a conversation with clear speaker labels.

Rules:
- Label each line as either "Agent:" or "Customer:"
- Split sentences logically into turns
- Do NOT summarize
- Do NOT change wording
- Keep original meaning intact

Transcript:
${transcript}
`;

const labeledResponse = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  temperature: 0,
  messages: [
    { role: "system", content: "You label speakers in conversations." },
    { role: "user", content: labelingPrompt }
  ]
});

const labeledTranscript = labeledResponse.choices?.[0]?.message?.content || transcript;

     /* =========================
   🎤 SPEECH QUALITY ANALYSIS
========================= */
const speechAnalysisRes = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  temperature: 0.2,
  messages: [
    {
      role: "system",
      content: "You are a speech and pronunciation coach."
    },
    {
      role: "user",
      content: `
Analyze the agent's speech quality from this call transcript.

Focus on:
- Fluency (pauses, smoothness)
- Pronunciation clarity (assume based on wording)
- Accent influence (if noticeable)
- Tone (monotone, engaging, robotic)

Transcript:
${labeledTranscript}

Return 4–5 bullet points only.
`
    }
  ]
});

const speechFeedback =
  speechAnalysisRes.choices?.[0]?.message?.content || "";
     
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
You are a strict QA auditor used in corporate call centers.

SCORING PHILOSOPHY:
- Start from a neutral score (3/5), NOT 5/5
- Increase score only if clearly demonstrated
- Reduce score for ANY issue (even minor)

STRICT RULES:
- DO NOT give 5/5 unless truly exceptional (rare)
- Most real agents score between 2–4
- Identify small issues:
  - Robotic tone
  - Lack of empathy
  - Missed probing questions
  - Weak ownership
  - Incomplete closing
  - No personalization

AGENT-ONLY RULE:
- Evaluate ONLY the Agent
- Ignore Customer completely

EVALUATION DEPTH:
- Each parameter MUST include:
  - Specific evidence from transcript
  - What was missing
  - Why score is not higher

REAL QA BEHAVIOR:
- Even “good calls” should not exceed 85–90%
- A perfect 100% should be extremely rare

Return valid JSON only.
`;

const USER = `
Mode: call
Evaluator Name: ${evaluatorName}
Agent Name: ${agentName}

Call Transcript:
${labeledTranscript}

IMPORTANT INSTRUCTIONS:

1. The conversation contains TWO speakers:
   - Agent (support representative)
   - Customer

2. You MUST identify the AGENT automatically:
   - Agent usually introduces themselves
   - Agent provides help, solutions, guidance
   - Agent asks structured questions
   - Customer asks for help or raises issues

3. If unclear:
   - Assume the person providing support is the AGENT

4. ONLY evaluate the AGENT:
   - Ignore customer grammar, tone, or mistakes

5. If speaker roles are unclear:
   - Still attempt best possible inference
   - Do NOT fail

6. Be strict and evidence-based
7. You MUST identify at least 2–3 improvement areas:
   - Even if the call seems good
   - Do not say "everything is perfect"

8. If no issues are obvious:
   - Look deeper for:
     - tone improvement
     - better phrasing
     - stronger empathy
     - better closing
Parameters:
${JSON.stringify(paramsForMode, null, 2)}

Rubrics (if provided for some parameters):
${JSON.stringify(rubricBundle, null, 2)}

Grammar evaluation must include:
- Tense accuracy
- Subject-verb agreement
- Articles usage (a/an/the)
- Prepositions

If errors exist:
- Quote exact sentence from transcript
- Explain what is wrong

If no major errors:
- Still identify at least 1 minor improvement area

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
    json.transcript = labeledTranscript;
    /* =========================
   🔥 FORCE REALISTIC SCORING
========================= */
if (Array.isArray(json.parameterScores)) {

  let total = 0;

  json.parameterScores = json.parameterScores.map(p => {
    let score = Number(p.score) || 3;

    // 🚫 Prevent easy 5s
    if (score === 5) {
      score = 4; // downgrade perfect scores
    }

    // ensure valid range
    if (score < 1) score = 1;
    if (score > 5) score = 4;

    total += score;

    return { ...p, score };
  });

  const count = json.parameterScores.length || 1;
  const finalScore = Math.round((total / (count * 5)) * 100);

  json.finalScore = finalScore;

  // 🚫 cap unrealistic perfect scores
  if (json.finalScore > 92) {
    json.finalScore = 88;
  }
}
    // ✅ Helpful meta
    json.speechFeedback = speechFeedback;
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
