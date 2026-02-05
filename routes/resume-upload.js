const express = require("express");
const multer = require("multer");
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

    const text = req.file.buffer.toString("utf8");

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
${text}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    const raw = response.choices[0].message.content.trim();

    const data = JSON.parse(raw);

    res.json(data);

  } catch (err) {
    console.error("RESUME IMPORT ERROR:", err);
    res.status(500).json({ error: "Resume import failed" });
  }
});

module.exports = router;
