const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ✅ ROUTE IMPORTS
const scriptsRoutes = require("./routes/scripts");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
   INTONATION ROUTE
========================= */
app.use("/api/sentence-intonation", require("./routes/intonation"));

/* =========================
   ✅ SCRIPTS ROUTE (FIXED)
========================= */
app.use("/api/scripts", scriptsRoutes);

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
You are an English pronunciation coach.

CRITICAL RULES:
- Plain text only
- No markdown
- No bullets
- Do NOT split pronunciation across lines
- Alphabet-only pronunciation
- Use hyphens to show syllables
- Use FULL CAPITAL LETTERS for the stressed syllable

FORMAT (EXACT):

IPA: /.../
Syllables: number
Stress: number
Correct pronunciation: alphabet-based pronunciation with hyphens and CAPS for stress
Common mistakes: short phrase
Why it happens: simple explanation
Fix: simple habit correction
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

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
