const express = require("express");
const router = express.Router();

const multer = require("multer");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// memory upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// ✅ helper
function safeText(s) {
  return String(s || "").trim();
}

router.post("/qa-audit-audio", upload.single("audio"), async (req, res) => {
  try {
    const { toFile } = require("openai");

    const mode = safeText(req.body.mode || "call");
    const evaluatorName = safeText(req.body.evaluatorName || "");
    const agentName = safeText(req.body.agentName || "");

    // params + rubrics from guide
    let paramsState = null;
    let rubricsState = null;
    try {
      paramsState = req.body.paramsState ? JSON.parse(req.body.paramsState) : null;
    } catch {}
    try {
      rubricsState = req.body.rubricsState ? JSON.parse(req.body.rubricsState) : null;
    } catch {}

    if (mode !== "call") {
      return res.status(400).json({ error: "Audio audit currently allowed only for CALL mode." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Audio file required." });
    }

    // ✅ Convert buffer to OpenAI readable file
    const audioFile = await toFile(req.file.buffer, req.file.originalname || "call.webm");

    // ✅ 1) Transcribe
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe"
    });

    const transcript = safeText(transcription.text || "");

    if (!transcript || transcript.length < 10) {
      return res.json({
        transcript: "",
        audit: null,
        error: "Could not detect speech clearly. Please upload clearer audio."
      });
    }

    // ✅ 2) Use existing QA audit text endpoint internally (same API)
    // Instead of calling HTTP again, we call OpenAI audit logic by importing qa-audits route if needed.
    // But easiest = do HTTP call to same server endpoint:
    const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      `http://localhost:${process.env.PORT || 5000}`;

    const auditRes = await fetch(`${baseUrl}/api/qa-audit-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        text: transcript,
        evaluatorName,
        agentName,
        paramsState,
        rubricsState
      })
    });

    const auditJson = await auditRes.json();

    if (!auditRes.ok) {
      return res.status(500).json({
        error: "Audit generation failed after transcription.",
        transcript,
        details: auditJson
      });
    }

    return res.json({
      transcript,
      audit: auditJson
    });

  } catch (err) {
    console.error("QA AUDIO AUDIT ERROR:", err);
    return res.status(500).json({ error: "Audio audit failed", details: err.message });
  }
});

module.exports = router;
