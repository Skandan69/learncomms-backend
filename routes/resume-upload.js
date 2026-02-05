const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {

    let text = "";

    if (req.file.mimetype === "application/pdf") {
      const data = await pdf(req.file.buffer);
      text = data.text;
    } else {
      const result = await mammoth.extractRawText({
        buffer: req.file.buffer
      });
      text = result.value;
    }

    const prompt = `
Extract resume content into JSON:

{
 name:"",
 role:"",
 email:"",
 phone:"",
 summary:"",
 experience:[],
 skills:[]
}

Resume:
${text}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    const output = JSON.parse(response.choices[0].message.content);

    res.json(output);

  } catch (err) {
    console.error("RESUME UPLOAD ERROR:", err);
    res.status(500).json({ error: "Resume processing failed" });
  }
});

module.exports = router;
