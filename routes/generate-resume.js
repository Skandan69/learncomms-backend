const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/generate-resume", async (req, res) => {

  try {

    const {
      name,
      role,
      education,
      projects,
      skills,
      experience
    } = req.body;

    const prompt = `
You are a professional resume writer.

Create a resume for a fresher based on the user's information.

Return ONLY valid JSON in this format:

{
"name":"",
"title":"",
"summary":"",
"education":"",
"skills":["",""],
"experience":[
  {
   "company":"",
   "role":"",
   "duration":"",
   "bullets":["",""]
  }
]
}

User Information:

Name: ${name}
Target Role: ${role}
Education: ${education}
Projects: ${projects}
Skills: ${skills}
Experience: ${experience}

Rules:

- Generate a strong professional summary
- Convert projects into professional experience bullets
- Use simple professional English
- Bullet points must start with action verbs
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    let raw = response.choices[0].message.content.trim();

    raw = raw.replace(/```json|```/g, "");

    const data = JSON.parse(raw);

    res.json(data);

  } catch (err) {

    console.error("GENERATE RESUME ERROR:", err);

    res.status(500).json({
      error: "AI resume generation failed"
    });

  }

});

module.exports = router;
