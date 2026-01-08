const express = require("express");
const OpenAI = require("openai");
const scriptsIntelligence = require("../intelligence/scriptsIntelligence");

console.log("INTELLIGENCE LOADED:", Object.keys(scriptsIntelligence || {}));

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   HELPER: Emotion Injection
========================= */
function buildEmotionInstructions(emotion) {
  const emotionProfile =
    emotion && scriptsIntelligence.emotions?.[emotion];

  if (!emotionProfile) return "";

  return `
Emotional state: ${emotion}
Tone guidance: ${emotionProfile.toneGuidance}
Apply these emotional handling techniques:
${emotionProfile.modifiers.join(", ")}
`;
}

/* =========================
   HELPER: Response Parser
========================= */
function extractSection(raw, label) {
  const match = raw.match(
    new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`)
  );
  return match ? match[1].trim() : "";
}

/* ======================================================
   GENERIC SCRIPT HANDLER (REUSED)
====================================================== */
async function handleScript(req, res, options) {
  try {
    const {
      category,
      type = "default",
      emotion,
      overrides
    } = req.body;

    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const emotionInstructions = buildEmotionInstructions(emotion);

    let prompt = `
You are a workplace communication trainer and customer communication coach.

${options.intro}

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

${emotionInstructions}
`;

    /* ======================================================
       v1.6 — USER OVERRIDE INTERPRETATION (KEY UPGRADE)
    ====================================================== */
    if (overrides) {
      const { roleIntent, emotionIntent, softSkillIntent } = overrides;

      prompt += `
IMPORTANT CONTEXT FROM USER:

The user has provided additional background and expectations.

You MUST:
- Adapt your language to suit the user's familiarity level
- Acknowledge any repeated interactions or prior attempts
- Adjust clarity, pace, and reassurance accordingly
- Sound human, calm, and supportive — NOT corporate or policy-driven
`;

      if (roleIntent) {
        prompt += `
User background / familiarity (adjust language and complexity accordingly):
"${roleIntent}"
`;
      }

      if (emotionIntent) {
        prompt += `
User history or situation to acknowledge clearly:
"${emotionIntent}"
`;
      }

      if (softSkillIntent) {
        prompt += `
Desired communication style that MUST be clearly demonstrated:
"${softSkillIntent}"
`;
      }

      prompt += `
Naturally weave these points into the response.
Do not list them. Do not sound scripted.
`;
    }

    /* =========================
       RULES + OUTPUT FORMAT
    ========================= */
    prompt += `
Rules:
${options.rules}

Return output in EXACT format:

Primary:
<text>

Alternative 1:
<text>

Alternative 2:
<text>
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: options.temperature
    });

    const raw = response.choices[0].message.content;

    res.json({
      primary: extractSection(raw, "Primary"),
      alternative1: extractSection(raw, "Alternative 1"),
      alternative2: extractSection(raw, "Alternative 2")
    });

  } catch (error) {
    console.error(options.errorTag, error);
    res.status(500).json({ error: options.errorMessage });
  }
}

/* ======================================================
   ROUTES (UNCHANGED)
====================================================== */

router.post("/call-opening", (req, res) =>
  handleScript(req, res, {
    intro: `Generate THREE DIFFERENT call opening scripts.
Script 1: Primary (best balanced)
Script 2: Alternative (slightly warmer)
Script 3: Alternative (slightly more confident)`,
    rules: `- Spoken English
- Polite, calm, confident
- Each script: 1–2 sentences
- Neutral global English
- No emojis or explanations`,
    temperature: 0.45,
    errorTag: "CALL OPENING ERROR:",
    errorMessage: "Failed to generate call opening scripts"
  })
);

router.post("/call-closing", (req, res) =>
  handleScript(req, res, {
    intro: `Generate THREE DIFFERENT call closing scripts.
Script 1: Professional & reassuring
Script 2: Warmer & appreciative
Script 3: Confident & concise`,
    rules: `- Spoken English
- Clear closure or next step
- 1–2 sentences
- Neutral global English`,
    temperature: 0.45,
    errorTag: "CALL CLOSING ERROR:",
    errorMessage: "Failed to generate call closing scripts"
  })
);

router.post("/call-hold", (req, res) =>
  handleScript(req, res, {
    intro: `Generate THREE DIFFERENT call hold / pause scripts.
Script 1: Polite & reassuring
Script 2: Warmer & empathetic
Script 3: Confident & concise`,
    rules: `- Ask permission politely
- Explain reason briefly
- 1–2 sentences`,
    temperature: 0.45,
    errorTag: "CALL HOLD ERROR:",
    errorMessage: "Failed to generate call hold scripts"
  })
);

router.post("/call-transfer", (req, res) =>
  handleScript(req, res, {
    intro: `Generate THREE DIFFERENT call transfer scripts.
Script 1: Clear & professional
Script 2: Warmer & reassuring
Script 3: Confident & concise`,
    rules: `- Explain reason for transfer
- Reassure continuity
- 1–2 sentences`,
    temperature: 0.45,
    errorTag: "CALL TRANSFER ERROR:",
    errorMessage: "Failed to generate call transfer scripts"
  })
);

router.post("/follow-up-call", (req, res) =>
  handleScript(req, res, {
    intro: `Generate THREE DIFFERENT follow-up call scripts.
Script 1: Professional & contextual
Script 2: Warmer & reassuring
Script 3: Confident & concise`,
    rules: `- Reference previous interaction
- Sound prepared
- 1–2 sentences`,
    temperature: 0.45,
    errorTag: "FOLLOW-UP ERROR:",
    errorMessage: "Failed to generate follow-up call scripts"
  })
);

router.post("/objection-handling", (req, res) =>
  handleScript(req, res, {
    intro: `Generate THREE DIFFERENT objection handling responses.
Script 1: Empathetic & balanced
Script 2: Calmer & reassuring
Script 3: Confident & persuasive`,
    rules: `- Acknowledge concern first
- No defensiveness
- 1–2 sentences`,
    temperature: 0.5,
    errorTag: "OBJECTION ERROR:",
    errorMessage: "Failed to generate objection handling scripts"
  })
);

router.post("/apology-recovery", (req, res) =>
  handleScript(req, res, {
    intro: `Generate THREE DIFFERENT apology / recovery scripts.
Script 1: Empathetic & accountable
Script 2: Warmer & reassuring
Script 3: Solution-focused`,
    rules: `- Take responsibility
- Reassure corrective action
- 1–2 sentences`,
    temperature: 0.4,
    errorTag: "APOLOGY ERROR:",
    errorMessage: "Failed to generate apology scripts"
  })
);

router.post("/delay-handling", (req, res) =>
  handleScript(req, res, {
    intro: `Generate THREE DIFFERENT delay handling responses.
Script 1: Clear & reassuring
Script 2: Warmer & empathetic
Script 3: Expectation-focused`,
    rules: `- Acknowledge delay
- Set expectations
- 1–2 sentences`,
    temperature: 0.4,
    errorTag: "DELAY ERROR:",
    errorMessage: "Failed to generate delay handling scripts"
  })
);

router.post("/chat-support", (req, res) =>
  handleScript(req, res, {
    intro: `Generate THREE DIFFERENT chat support responses.
Script 1: Clear & professional
Script 2: Warmer & friendlier
Script 3: Confident & concise`,
    rules: `- Chat-style language
- Short sentences
- No slang`,
    temperature: 0.35,
    errorTag: "CHAT ERROR:",
    errorMessage: "Failed to generate chat support scripts"
  })
);

router.post("/email-scripts", (req, res) =>
  handleScript(req, res, {
    intro: `Generate THREE DIFFERENT professional email messages.
Script 1: Clear & professional
Script 2: Warmer & polite
Script 3: Confident & direct`,
    rules: `- Professional email tone
- 3–5 short lines
- No emojis`,
    temperature: 0.35,
    errorTag: "EMAIL ERROR:",
    errorMessage: "Failed to generate email scripts"
  })
);

/* =========================
   EXPORT ROUTER
========================= */
module.exports = router;
