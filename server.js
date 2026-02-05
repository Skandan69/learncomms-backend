const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// ✅ ROUTE IMPORTS
const scriptsRoutes = require("./routes/scripts");
const qaAuditsRoutes = require("./routes/qa-audits");
const qaAuditAudioRoutes = require("./routes/qa-audit-audio");
const askLearnCommsRoutes = require("./routes/ask-learncomms");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
/* =========================
   MULTER (AUDIO UPLOAD)
========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB limit
});

/* =========================
   OPENAI CLIENT
========================= */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("LearnComms Backend is running 🚀");
});
/* =========================
   VISITOR COUNTER
========================= */

let visitorCount = 0;

app.get("/api/visit", (req, res) => {
  visitorCount++;
  res.json({ count: visitorCount });
});

/* =========================
   INTONATION ROUTE
========================= */
app.use("/api/sentence-intonation", require("./routes/intonation"));

/* =========================
   ✅ SCRIPTS ROUTE (FIXED)
========================= */
app.use("/api/scripts", scriptsRoutes);
app.use("/api", qaAuditsRoutes);
app.use("/api", qaAuditAudioRoutes);
app.use("/api", askLearnCommsRoutes);

/* =========================
   STATIC AUDIO (INTONATION)
========================= */
app.use(
  "/api/audio-intonation",
  express.static(path.join(__dirname, "audio-intonation"))
);

/* =========================
   PRONUNCIATION TEXT
========================= */
async function generatePronunciation(word) {
  const prompt = `
You are an English pronunciation and vocabulary coach.

CRITICAL RULES:
- Plain text only
- No markdown
- No bullets
- Do NOT split pronunciation across lines
- Alphabet-only pronunciation
- Use hyphens to show syllables
- Use FULL CAPITAL LETTERS for the stressed syllable
- Keep Meaning simple (one short line)
- Give ONE clear example sentence only
- Give 4–6 synonyms only (comma-separated)
- Do NOT add any extra fields

FORMAT (EXACT):

Part of speech: <noun/verb/adjective/adverb>
Meaning: <simple meaning>
Example: <one short example sentence>
Synonyms: <comma-separated list>

IPA: /.../
Syllables: number
Stress: number
Correct pronunciation: alphabet-based pronunciation with hyphens and CAPS for stress
Common mistakes: short phrase

Correct word: ${word}
`;

  const r = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2
  });

  return r.choices[0].message.content.trim();
}

/* =========================
   PRONUNCIATION AUDIO
========================= */
const AUDIO_PRON_DIR = path.join(__dirname, "audio-pronunciation");
if (!fs.existsSync(AUDIO_PRON_DIR)) fs.mkdirSync(AUDIO_PRON_DIR);

app.use("/api/audio-pronunciation", express.static(AUDIO_PRON_DIR));

async function generatePronunciationAudio(word) {
  const filename =
    crypto.createHash("md5").update(word.toLowerCase()).digest("hex") + ".mp3";
  const filepath = path.join(AUDIO_PRON_DIR, filename);

  if (fs.existsSync(filepath)) {
    return `/api/audio-pronunciation/${filename}`;
  }

  const response = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: word
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  return `/api/audio-pronunciation/${filename}`;
}

/* =========================
   PRONUNCIATION AUDIO API
========================= */
app.post("/api/pronunciation-audio", async (req, res) => {
  try {
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ error: "Word required" });
    }

    const audio_url = await generatePronunciationAudio(word);
    res.json({ audio_url });

  } catch (err) {
    console.error("PRONUNCIATION AUDIO ERROR:", err);
    res.status(500).json({ error: "Audio generation failed" });
  }
});

/* =========================
   MAIN PRONOUNCE API
========================= */
app.post("/api/pronounce", async (req, res) => {
  try {
    const { text, mode } = req.body;
    if (!text) return res.status(400).json({ error: "Text required" });

    if (mode === "sentence") {
      const prompt = `
You are an English language trainer.

Task:
- Identify grammar, tense, word order, and punctuation issues.
- Provide ONE corrected sentence.
- Provide TWO simple alternative correct sentences.

Use EXACT format:

Incorrect sentence:
${text}

Why it is incorrect:
<clear explanation>

Corrected sentence:
<best corrected version>

Alternative correct sentence 1:
<simple alternative>

Alternative correct sentence 2:
<simple alternative>
`;

      const r = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0
      });

      return res.json({ result: r.choices[0].message.content.trim() });
    }

    if (mode === "email") {
      const prompt = `
You are an English communication trainer.

Convert the message into THREE clearly different professional emails.

Styles:
1. Formal and polite
2. Neutral and clear
3. Direct and concise

Use EXACT format:

Email version 1 (Formal):
Subject:
<body>

Email version 2 (Neutral):
Subject:
<body>

Email version 3 (Direct):
Subject:
<body>

Text:
${text}
`;

      const r = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4
      });

      return res.json({ result: r.choices[0].message.content.trim() });
    }

    const result = await generatePronunciation(text);
    return res.json({ result });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   MESSAGE DECODER
========================= */
app.use("/api/message-decode", require("./routes/message-decode"));
app.use("/api/message-reply", require("./routes/message-reply"));
app.post("/api/writing-assistant", async (req, res) => {
  try {
    const { text, channel = "chat", tone = "neutral" } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const prompt = `
You are a professional writing assistant.

Task:
Generate THREE complete and usable message drafts based on the user's request.

Instructions:
- Understand the intent of the request
- Do NOT rewrite the request sentence
- Each version must be a FULL message (multiple lines allowed)
- Each version must be clearly different in style
- Do NOT split subject, greeting, and body across versions
- Use proper formatting based on channel
- Separate each version using this exact delimiter: ===VERSION===

Context:
- Channel: ${channel}
- Desired tone: ${tone}

User request:
${text}

Return ONLY the drafts in this format:

Version 1:
<full message>

===VERSION===
Version 2:
<full message>

===VERSION===
Version 3:
<full message>
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    const raw = response.choices[0].message.content;

    const versions = raw
      .split("===VERSION===")
      .map(v => v.replace(/Version \d+:/i, "").trim())
      .filter(Boolean);

    res.json({ versions });

  } catch (err) {
    console.error("WRITING ASSISTANT ERROR:", err);
    res.status(500).json({ error: "Writing assistant failed" });
  }
});
/* =========================
   SPEECH SCORING API
========================= */
app.post("/api/speech-score", upload.single("audio"), async (req, res) => {
  try {
    const { toFile } = require("openai");

    const prompt = (req.body.prompt || "").trim();
    const level = (req.body.level || "intermediate").trim();

    if (!req.file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    // ✅ Convert uploaded buffer into a file OpenAI can read
    function extFromMime(mime) {
  if (!mime) return null;
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("webm")) return "webm";
  return null;
}

const originalName = (req.file.originalname || "").trim();
const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");

const ext = extFromMime(req.file.mimetype);
const finalName = ext ? `speech.${ext}` : (safeName || "speech.webm");

const audioFile = await toFile(req.file.buffer, finalName);

    // 1️⃣ Speech-to-text (Transcription)
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe"
    });

    const transcript = (transcription.text || "").trim();

    if (!transcript) {
      return res.json({
        transcript: "",
        scores: {
          overall: 0,
          pronunciation: 0,
          fluency: 0,
          intonation: 0,
          grammar: 0,
          vocabulary: 0,
          coherence: 0
        },
        strengths: [],
        improvements: [
          "Speech not detected clearly. Please record again in a quiet place."
        ],
        trainingPlan: [
          "Record 40–60 seconds and speak slightly slower.",
          "Avoid background noise.",
          "Retry with clear pronunciation."
        ]
      });
    }

    // 2️⃣ Scoring + Feedback
    const scoringPrompt = `
You are an expert English speech evaluator.

Evaluate the user’s spoken English based on the transcript.

RULES:
- Accent must NOT be penalized.
- Evaluate only clarity/intelligibility, fluency, intonation, grammar, vocabulary, coherence.
- Scores must be 0–10.
- Be strict but fair.
- Feedback must be practical for Indian learners / Tier 2-3 city learners.
- No generic praise.

User level: ${level}

Optional speaking prompt:
${prompt}

Transcript:
${transcript}

Return ONLY valid JSON in EXACT format:

{
  "transcript": "",
  "scores": {
    "overall": 0,
    "pronunciation": 0,
    "fluency": 0,
    "intonation": 0,
    "grammar": 0,
    "vocabulary": 0,
    "coherence": 0
  },
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "trainingPlan": ["...", "...", "..."]
}
`;

    const scoreRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: scoringPrompt }],
      temperature: 0.2
    });

    const raw = scoreRes.choices[0].message.content.trim();

    let output;
    try {
      output = JSON.parse(raw);
    } catch (e) {
      console.error("SPEECH SCORE JSON PARSE ERROR:", raw);
      return res.status(500).json({
        error: "Speech scoring failed due to formatting. Please try again."
      });
    }

    // Always use real transcript
    output.transcript = transcript;

    return res.json(output);

  } catch (err) {
    console.error("SPEECH SCORING ERROR:", err);
    res.status(500).json({ error: "Speech scoring failed" });
  }
});
app.post("/api/scripts-assistant", async (req, res) => {
  try {
    const { text, channel = "call", tone = "neutral" } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const prompt = `
You are a workplace communication trainer.

Task:
Generate THREE complete, usable professional scripts based on user's request.

Context:
- Channel: ${channel}
- Tone: ${tone}

Rules:
- Suitable for customer support / workplace English
- Clear, simple, natural spoken English
- No placeholders
- No emojis
- No explanations
- Each version must be different
- If channel is email, include Subject + body

User request:
${text}

Return ONLY this exact format:

===VERSION===
<message>

===VERSION===
<message>

===VERSION===
<message>
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    const raw = response.choices[0].message.content;

    const versions = raw
      .split("===VERSION===")
      .map(v => v.trim())
      .filter(Boolean);

    return res.json({ versions });

  } catch (err) {
    console.error("SCRIPTS ASSISTANT ERROR:", err);
    res.status(500).json({ error: "Scripts assistant failed" });
  }
});

const pdfParse = require("pdf-parse");

/* =========================
   AI RESUME IMPORT API
========================= */

app.post("/api/import-resume", upload.single("resume"), async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // ---- Extract text from PDF ----
    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text;

    // ---- Send to OpenAI ----
    const prompt = `
You are a resume parser.

Return STRICT JSON ONLY in this format:

{
  "name": "",
  "title": "",
  "email": "",
  "phone": "",
  "summary": "",
  "experience": [
    { "points": ["", ""] }
  ],
  "skills": ["", ""]
}

Resume text:
${resumeText}
`;

    const aiRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    const raw = aiRes.choices[0].message.content.trim();

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("AI JSON ERROR:", raw);
      return res.status(500).json({ error: "AI parsing failed" });
    }

    res.json(parsed);

  } catch (err) {
    console.error("RESUME IMPORT ERROR:", err);
    res.status(500).json({ error: "Resume import failed" });
  }

});
/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
