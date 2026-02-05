const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let text = "";

    // ===== PDF =====
    if (req.file.mimetype === "application/pdf") {
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    }

    // ===== DOCX =====
    else if (
      req.file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({
        buffer: req.file.buffer
      });
      text = result.value;
    }

    else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    // Clean + limit text (VERY IMPORTANT)
    text = text.replace(/\s+/g, " ").slice(0, 8000);

    if (text.length < 100) {
      return res.status(400).json({ error: "Could not read resume" });
    }

    // =====================
    // AI PROMPT
    // =====================

    const prompt = `
Extract resume into STRICT JSON only.

Return ONLY valid JSON.

{
 "name":"",
 "role":"",
 "email":"",
 "phone":"",
 "summary":"",
 "experience":[],
 "skills":[]
}

Resume:
${text}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    let raw = response.choices[0].message.content.trim();

    // ===== Remove markdown if AI adds =====
    raw = raw.replace(/```json|```/g, "").trim();

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("BAD JSON:", raw);

      return res.status(500).json({
        error: "AI formatting failed"
      });
    }

    res.json(parsed);

  } catch (err) {

    console.error("UPLOAD ERROR:", err);

    res.status(500).json({
      error: "Resume processing failed"
    });
  }
});

module.exports = router;
