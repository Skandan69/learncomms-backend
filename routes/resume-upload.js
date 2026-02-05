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

    let extractedText = "";

    // PDF
    if (req.file.mimetype === "application/pdf") {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
    }

    // DOCX
    else if (
      req.file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const docResult = await mammoth.extractRawText({
        buffer: req.file.buffer
      });
      extractedText = docResult.value;
    }

    else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    if (!extractedText || extractedText.length < 50) {
      return res.status(400).json({ error: "Could not read resume" });
    }

    const prompt = `
You are a resume parser.

Return ONLY valid JSON.

Rules:
- experience MUST be array of strings
- skills MUST be array of strings

Format exactly:

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
${extractedText}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    const raw = response.choices[0].message.content.trim();

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("AI JSON ERROR:", raw);
      return res.status(500).json({ error: "AI parsing failed" });
    }

    res.json(parsed);

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ error: "Resume processing failed" });
  }
});

module.exports = router;
