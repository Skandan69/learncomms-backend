module.exports = {
  /* =========================
     CALL OPENING
  ========================= */
  callOpening: {
    default: {
      coreSkills: [
        "empathy",
        "politeness",
        "professional warmth",
        "emotional validation"
      ],
      strategyBalance: {
        empathy: 0.6,
        persuasion: 0.2,
        authority: 0.2
      }
    },

    customerCare: {
      coreSkills: [
        "empathy",
        "reassurance",
        "active listening",
        "de-escalation awareness"
      ],
      strategyBalance: {
        empathy: 0.7,
        persuasion: 0.1,
        authority: 0.2
      }
    },

    sales: {
      coreSkills: [
        "confidence",
        "rapport building",
        "value framing"
      ],
      strategyBalance: {
        empathy: 0.3,
        persuasion: 0.5,
        authority: 0.2
      }
    }
  },

  /* =========================
     CALL CLOSING
  ========================= */
  callClosing: {
    default: {
      coreSkills: [
        "reassurance",
        "gratitude",
        "professional closure",
        "confidence"
      ],
      strategyBalance: {
        empathy: 0.5,
        persuasion: 0.2,
        authority: 0.3
      }
    },

    customerCare: {
      coreSkills: [
        "gratitude",
        "emotional reassurance",
        "next-step clarity"
      ],
      strategyBalance: {
        empathy: 0.6,
        persuasion: 0.1,
        authority: 0.3
      }
    },

    sales: {
      coreSkills: [
        "confidence",
        "positive reinforcement",
        "future engagement"
      ],
      strategyBalance: {
        empathy: 0.3,
        persuasion: 0.4,
        authority: 0.3
      }
    }
  },

  /* =========================
     CALL HOLD / PAUSE
  ========================= */
  callHold: {
    default: {
      coreSkills: [
        "politeness",
        "expectation setting",
        "reassurance",
        "clarity"
      ],
      strategyBalance: {
        empathy: 0.5,
        persuasion: 0.1,
        authority: 0.4
      }
    },

    customerCare: {
      coreSkills: [
        "empathy",
        "reassurance",
        "time transparency",
        "calm tone"
      ],
      strategyBalance: {
        empathy: 0.6,
        persuasion: 0.1,
        authority: 0.3
      }
    },

    technicalSupport: {
      coreSkills: [
        "clarity",
        "professional control",
        "process explanation"
      ],
      strategyBalance: {
        empathy: 0.3,
        persuasion: 0.1,
        authority: 0.6
      }
    }
  }
};
