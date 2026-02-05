const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/import-resume", upload.single("resume"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let extractedText = "";

    // ===== PDF =====
    if (req.file.mimetype === "application/pdf") {
      const data = await pdfParse(req.file.buffer);
      extractedText = data.text;
    }

    // ===== DOCX =====
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
      return res.status(400).json({ error: "Unsupported file type" });
    }

    const prompt = `
Extract resume info and return ONLY valid JSON:

{
 "name":"",
 "title":"",
 "email":"",
 "phone":"",
 "summary":"",
 "experience":[
   { "points":["",""] }
 ],
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

    let raw = response.choices[0].message.content.trim();

    // Remove markdown if AI adds it
    raw = raw.replace(/```json|```/g, "");

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error("AI JSON ERROR:", raw);
      return res.status(500).json({ error: "AI parsing failed" });
    }

    res.json(data);

  } catch (err) {
    console.error("RESUME IMPORT ERROR:", err);
    res.status(500).json({ error: "Resume import failed" });
  }
});

module.exports = router;
