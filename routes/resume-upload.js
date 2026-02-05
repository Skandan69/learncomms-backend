const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/import-resume", upload.single("resume"), async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let extractedText = "";

    // =====================
    // PDF
    // =====================
    if (req.file.mimetype === "application/pdf") {

      const data = await pdf(req.file.buffer);
      extractedText = data.text;
    }

    // =====================
    // DOCX
    // =====================
    else if (
      req.file.mimetype.includes("word") ||
      req.file.mimetype.includes("officedocument")
    ) {

      const result = await mammoth.extractRawText({
        buffer: req.file.buffer
      });

      extractedText = result.value;
    }

    else {
      return res.status(400).json({ error: "Unsupported file format" });
    }

    // =====================
    // SEND TO AI
    // =====================

    const prompt = `
You are a resume parser.

Convert this resume into STRICT JSON only.

Return EXACT structure:

{
 "name": "",
 "title": "",
 "email": "",
 "phone": "",
 "summary": "",
 "experience": [
   {
     "points": ["", "", ""]
   }
 ],
 "skills": ["", "", ""]
}

Resume text:
${extractedText}
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
      return res.status(500).json({ error: "AI parse failed" });
    }

    res.json(parsed);

  } catch (err) {
    console.error("RESUME IMPORT ERROR:", err);
    res.status(500).json({ error: "Resume import failed" });
  }

});

module.exports = router;
