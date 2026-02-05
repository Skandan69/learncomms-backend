const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai");

const router = express.Router();

/* ======================
   MULTER SETUP
====================== */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/* ======================
   OPENAI CLIENT
====================== */

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ======================
   UPLOAD ROUTE
====================== */

router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {

    // ✅ Check file
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let extractedText = "";

    // =====================
    // PDF HANDLING
    // =====================
    if (req.file.mimetype === "application/pdf") {

      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;

    } 
    // =====================
    // DOCX HANDLING
    // =====================
    else if (
      req.file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {

      const docResult = await mammoth.extractRawText({
        buffer: req.file.buffer
      });

      extractedText = docResult.value;

    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    // Safety
    if (!extractedText || extractedText.length < 50) {
      return res.status(400).json({ error: "Could not read resume content" });
    }

    /* =====================
       GPT PROMPT
    ===================== */

    const prompt = `
You are a resume parser.

Extract information strictly into VALID JSON.

Return ONLY JSON. No explanation.

Format exactly:

{
  "name": "",
  "role": "",
  "email": "",
  "phone": "",
  "summary": "",
  "experience": [],
  "skills": []
}

Resume content:
${extractedText}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    const raw = response.choices[0].message.content.trim();

    // =====================
    // CLEAN JSON (important)
    // =====================

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("JSON PARSE FAILED:", raw);

      return res.status(500).json({
        error: "AI response parsing failed"
      });
    }

    // =====================
    // SEND RESULT
    // =====================

    res.json(parsed);

  } catch (err) {

    console.error("RESUME UPLOAD ERROR:", err);

    res.status(500).json({
      error: "Resume processing failed"
    });
  }
});

module.exports = router;
