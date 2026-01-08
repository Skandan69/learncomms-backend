const express = require("express");
const OpenAI = require("openai");
const scriptsIntelligence = require("../intelligence/scriptsIntelligence");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ======================================================
   SCRIPTS — CALL OPENING (PRIMARY + ALTERNATIVES)
====================================================== */
router.post("/call-opening", async (req, res) => {
  try {
    const {
      category = "callOpening",
      type = "default"
    } = req.body;

    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const prompt = `
You are a workplace communication trainer.

Generate THREE DIFFERENT call opening scripts.

Script 1: Primary (best balanced)
Script 2: Alternative (slightly warmer)
Script 3: Alternative (slightly more confident)

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

Rules:
- Spoken English
- Polite, calm, confident
- Each script: 1–2 sentences only
- Neutral global English
- Human, non-robotic
- No placeholders
- No emojis
- No explanations

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
      temperature: 0.45
    });

    const raw = response.choices[0].message.content;

    const extract = (label) => {
      const match = raw.match(
        new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`)
      );
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("Primary"),
      alternative1: extract("Alternative 1"),
      alternative2: extract("Alternative 2")
    });

  } catch (error) {
    console.error("CALL OPENING SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate call opening scripts" });
  }
});

/* ======================================================
   SCRIPTS — CALL CLOSING (PRIMARY + ALTERNATIVES)
====================================================== */
router.post("/call-closing", async (req, res) => {
  try {
    const {
      category = "callClosing",
      type = "default"
    } = req.body;

    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const prompt = `
You are a workplace communication trainer.

Generate THREE DIFFERENT call closing scripts.

Script 1: Primary (professional & reassuring)
Script 2: Alternative (warmer & appreciative)
Script 3: Alternative (confident & concise)

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

Rules:
- Spoken English
- Polite, calm, confident
- Each script: 1–2 sentences only
- Reassure next steps or closure
- Neutral global English
- No placeholders
- No emojis
- No explanations

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
      temperature: 0.45
    });

    const raw = response.choices[0].message.content;

    const extract = (label) => {
      const match = raw.match(
        new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`)
      );
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("Primary"),
      alternative1: extract("Alternative 1"),
      alternative2: extract("Alternative 2")
    });

  } catch (error) {
    console.error("CALL CLOSING SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate call closing scripts" });
  }
});
/* ======================================================
   SCRIPTS — CALL HOLD / PAUSE (PRIMARY + ALTERNATIVES)
====================================================== */
router.post("/call-hold", async (req, res) => {
  try {
    const {
      category = "callHold",
      type = "default"
    } = req.body;

    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const prompt = `
You are a workplace communication trainer.

Generate THREE DIFFERENT call hold / pause scripts.

Script 1: Primary (polite & reassuring)
Script 2: Alternative (warmer & empathetic)
Script 3: Alternative (confident & concise)

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

Rules:
- Spoken English
- Clear reason for hold
- Ask permission politely
- Each script: 1–2 sentences only
- Neutral global English
- No placeholders
- No emojis
- No explanations

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
      temperature: 0.45
    });

    const raw = response.choices[0].message.content;

    const extract = (label) => {
      const match = raw.match(
        new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`)
      );
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("Primary"),
      alternative1: extract("Alternative 1"),
      alternative2: extract("Alternative 2")
    });

  } catch (error) {
    console.error("CALL HOLD SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate call hold scripts" });
  }
});
/* ======================================================
   SCRIPTS — CALL TRANSFER (PRIMARY + ALTERNATIVES)
====================================================== */
router.post("/call-transfer", async (req, res) => {
  try {
    const {
      category = "callTransfer",
      type = "default"
    } = req.body;

    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const prompt = `
You are a workplace communication trainer.

Generate THREE DIFFERENT call transfer scripts.

Script 1: Primary (clear & professional)
Script 2: Alternative (warmer & reassuring)
Script 3: Alternative (confident & concise)

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

Rules:
- Spoken English
- Explain reason for transfer clearly
- Reassure continuity of support
- Each script: 1–2 sentences only
- Neutral global English
- No placeholders
- No emojis
- No explanations

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
      temperature: 0.45
    });

    const raw = response.choices[0].message.content;

    const extract = (label) => {
      const match = raw.match(
        new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`)
      );
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("Primary"),
      alternative1: extract("Alternative 1"),
      alternative2: extract("Alternative 2")
    });

  } catch (error) {
    console.error("CALL TRANSFER SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate call transfer scripts" });
  }
});
/* ======================================================
   SCRIPTS — FOLLOW-UP CALL (PRIMARY + ALTERNATIVES)
====================================================== */
router.post("/follow-up-call", async (req, res) => {
  try {
    const {
      category = "followUpCall",
      type = "default"
    } = req.body;

    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const prompt = `
You are a workplace communication trainer.

Generate THREE DIFFERENT follow-up call scripts.

Script 1: Primary (professional & contextual)
Script 2: Alternative (warmer & reassuring)
Script 3: Alternative (confident & concise)

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

Rules:
- Spoken English
- Reference previous interaction naturally
- Sound prepared and respectful
- Each script: 1–2 sentences only
- Neutral global English
- No placeholders
- No emojis
- No explanations

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
      temperature: 0.45
    });

    const raw = response.choices[0].message.content;

    const extract = (label) => {
      const match = raw.match(
        new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`)
      );
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("Primary"),
      alternative1: extract("Alternative 1"),
      alternative2: extract("Alternative 2")
    });

  } catch (error) {
    console.error("FOLLOW-UP CALL SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate follow-up call scripts" });
  }
});
/* ======================================================
   SCRIPTS — OBJECTION HANDLING (PRIMARY + ALTERNATIVES)
====================================================== */
router.post("/objection-handling", async (req, res) => {
  try {
    const {
      category = "objectionHandling",
      type = "default"
    } = req.body;

    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const prompt = `
You are a workplace communication trainer.

Generate THREE DIFFERENT objection handling responses.

Script 1: Primary (empathetic & balanced)
Script 2: Alternative (calmer & reassuring)
Script 3: Alternative (confident & persuasive)

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

Rules:
- Spoken English
- Acknowledge the concern first
- Respond without sounding defensive
- Keep tone respectful and calm
- Each script: 1–2 sentences only
- Neutral global English
- No placeholders
- No emojis
- No explanations

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
      temperature: 0.5
    });

    const raw = response.choices[0].message.content;

    const extract = (label) => {
      const match = raw.match(
        new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`)
      );
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("Primary"),
      alternative1: extract("Alternative 1"),
      alternative2: extract("Alternative 2")
    });

  } catch (error) {
    console.error("OBJECTION HANDLING SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate objection handling scripts" });
  }
});
/* ======================================================
   SCRIPTS — APOLOGY / RECOVERY (PRIMARY + ALTERNATIVES)
====================================================== */
router.post("/apology-recovery", async (req, res) => {
  try {
    const {
      category = "apologyRecovery",
      type = "default"
    } = req.body;

    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const prompt = `
You are a workplace communication trainer.

Generate THREE DIFFERENT apology / recovery scripts.

Script 1: Primary (empathetic & accountable)
Script 2: Alternative (warmer & reassuring)
Script 3: Alternative (confident & solution-focused)

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

Rules:
- Spoken, natural English
- Take responsibility without blaming
- Acknowledge inconvenience or mistake
- Reassure corrective action
- Each script: 1–2 sentences only
- Neutral global English
- No placeholders
- No emojis
- No explanations

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
      temperature: 0.4
    });

    const raw = response.choices[0].message.content;

    const extract = (label) => {
      const match = raw.match(
        new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`)
      );
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("Primary"),
      alternative1: extract("Alternative 1"),
      alternative2: extract("Alternative 2")
    });

  } catch (error) {
    console.error("APOLOGY RECOVERY SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate apology scripts" });
  }
});
/* ======================================================
   SCRIPTS — DELAY HANDLING (PRIMARY + ALTERNATIVES)
====================================================== */
router.post("/delay-handling", async (req, res) => {
  try {
    const {
      category = "delayHandling",
      type = "default"
    } = req.body;

    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const prompt = `
You are a workplace communication trainer.

Generate THREE DIFFERENT delay handling responses.

Script 1: Primary (clear & reassuring)
Script 2: Alternative (warmer & empathetic)
Script 3: Alternative (confident & expectation-focused)

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

Rules:
- Spoken, natural English
- Clearly acknowledge the delay
- Set or reinforce expectations honestly
- Avoid excuses or blame
- Each script: 1–2 sentences only
- Neutral global English
- No placeholders
- No emojis
- No explanations

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
      temperature: 0.4
    });

    const raw = response.choices[0].message.content;

    const extract = (label) => {
      const match = raw.match(
        new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`)
      );
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("Primary"),
      alternative1: extract("Alternative 1"),
      alternative2: extract("Alternative 2")
    });

  } catch (error) {
    console.error("DELAY HANDLING SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate delay handling scripts" });
  }
});
/* ======================================================
   SCRIPTS — CHAT SUPPORT (PRIMARY + ALTERNATIVES)
====================================================== */
router.post("/chat-support", async (req, res) => {
  try {
    const {
      category = "chatSupport",
      type = "default"
    } = req.body;

    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const prompt = `
You are a workplace communication trainer.

Generate THREE DIFFERENT chat support responses.

Script 1: Primary (clear & professional)
Script 2: Alternative (warmer & friendlier)
Script 3: Alternative (confident & concise)

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

Rules:
- Chat-style language (not voice)
- Short, clear sentences
- Friendly but professional
- No fillers or slang
- Each script: 1–2 short sentences
- Neutral global English
- No emojis
- No explanations

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
      temperature: 0.35
    });

    const raw = response.choices[0].message.content;

    const extract = (label) => {
      const match = raw.match(
        new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`)
      );
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("Primary"),
      alternative1: extract("Alternative 1"),
      alternative2: extract("Alternative 2")
    });

  } catch (error) {
    console.error("CHAT SUPPORT SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate chat support scripts" });
  }
});
/* ======================================================
   SCRIPTS — EMAIL (PRIMARY + ALTERNATIVES)
====================================================== */
router.post("/email-scripts", async (req, res) => {
  try {
    const {
      category = "emailScripts",
      type = "default"
    } = req.body;

    const intelligence =
      scriptsIntelligence?.[category]?.[type] ||
      scriptsIntelligence?.[category]?.default;

    if (!intelligence) {
      return res.status(400).json({ error: "Invalid script configuration" });
    }

    const prompt = `
You are a workplace communication trainer.

Generate THREE DIFFERENT professional email messages.

Script 1: Primary (clear & professional)
Script 2: Alternative (warmer & polite)
Script 3: Alternative (confident & direct)

Apply these core soft skills:
${intelligence.coreSkills.join(", ")}

Soft-skill balance reference:
Empathy: ${intelligence.strategyBalance.empathy}
Persuasion: ${intelligence.strategyBalance.persuasion}
Authority: ${intelligence.strategyBalance.authority}

Rules:
- Professional email language
- Clear opening and closing
- No excessive formality
- No placeholders
- No emojis
- Each script: short email body (3–5 lines)
- Neutral global English
- Do NOT add explanations

Return output in EXACT format:

Primary:
<email body>

Alternative 1:
<email body>

Alternative 2:
<email body>
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35
    });

    const raw = response.choices[0].message.content;

    const extract = (label) => {
      const match = raw.match(
        new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\w|$)`)
      );
      return match ? match[1].trim() : "";
    };

    res.json({
      primary: extract("Primary"),
      alternative1: extract("Alternative 1"),
      alternative2: extract("Alternative 2")
    });

  } catch (error) {
    console.error("EMAIL SCRIPT ERROR:", error);
    res.status(500).json({ error: "Failed to generate email scripts" });
  }
});
/* =========================
   EXPORT ROUTER (LAST LINE)
========================= */
module.exports = router;
