const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   AUDIO STORAGE (ISOLATED)
========================= */
const AUDIO_DIR = path.join(__dirname, "../audio-intonation");
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR);
}

/* =========================
   SENTENCE INTONATION (PURE)
========================= */
router.post("/", async (req, res) => {
  try {
    const { sentence } = req.body;

    if (!sentence) {
      return res.status(400).json({ error: "Sentence required" });
    }

    const filename = crypto.randomUUID() + ".mp3";
    const filepath = path.join(AUDIO_DIR, filename);

    const response = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: sentence
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    res.json({
      audio_url: `/audio-intonation/${filename}`
    });

  } catch (err) {
    console.error("INTONATION ERROR:", err);
    res.status(500).json({ error: "Audio generation failed" });
  }
});

module.exports = router;
