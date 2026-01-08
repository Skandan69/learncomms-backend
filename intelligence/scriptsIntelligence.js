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
  },
/* =========================
   FOLLOW-UP CALL
========================= */
followUpCall: {
  default: {
    coreSkills: [
      "politeness",
      "context recall",
      "professional warmth",
      "clarity"
    ],
    strategyBalance: {
      empathy: 0.5,
      persuasion: 0.3,
      authority: 0.2
    }
  },

  customerCare: {
    coreSkills: [
      "empathy",
      "reassurance",
      "active listening",
      "service ownership"
    ],
    strategyBalance: {
      empathy: 0.6,
      persuasion: 0.2,
      authority: 0.2
    }
  },

  sales: {
    coreSkills: [
      "confidence",
      "value reinforcement",
      "relationship building"
    ],
    strategyBalance: {
      empathy: 0.3,
      persuasion: 0.5,
      authority: 0.2
    }
  },

  technicalSupport: {
    coreSkills: [
      "clarity",
      "issue tracking",
      "professional control"
    ],
    strategyBalance: {
      empathy: 0.4,
      persuasion: 0.1,
      authority: 0.5
    }
  }
},
  /* =========================
     CALL TRANSFER
  ========================= */
  callTransfer: {
    default: {
      coreSkills: [
        "clarity",
        "politeness",
        "expectation setting",
        "professional reassurance"
      ],
      strategyBalance: {
        empathy: 0.4,
        persuasion: 0.2,
        authority: 0.4
      }
    },

    customerCare: {
      coreSkills: [
        "empathy",
        "reassurance",
        "smooth handoff explanation"
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
        "process explanation",
        "confidence"
      ],
      strategyBalance: {
        empathy: 0.3,
        persuasion: 0.1,
        authority: 0.6
      }
    },

    sales: {
      coreSkills: [
        "confidence",
        "value framing",
        "trust building"
      ],
      strategyBalance: {
        empathy: 0.3,
        persuasion: 0.4,
        authority: 0.3
      }
    }
  }
/* =========================
   OBJECTION HANDLING
========================= */
objectionHandling: {
  default: {
    coreSkills: [
      "active listening",
      "empathy",
      "reframing",
      "calm persuasion"
    ],
    strategyBalance: {
      empathy: 0.5,
      persuasion: 0.4,
      authority: 0.1
    }
  },

  customerCare: {
    coreSkills: [
      "emotional validation",
      "reassurance",
      "de-escalation",
      "solution framing"
    ],
    strategyBalance: {
      empathy: 0.6,
      persuasion: 0.3,
      authority: 0.1
    }
  },

  sales: {
    coreSkills: [
      "confidence",
      "value justification",
      "trust building",
      "controlled persuasion"
    ],
    strategyBalance: {
      empathy: 0.3,
      persuasion: 0.5,
      authority: 0.2
    }
  },

  retention: {
    coreSkills: [
      "empathy",
      "commitment reassurance",
      "benefit reinforcement"
    ],
    strategyBalance: {
      empathy: 0.6,
      persuasion: 0.3,
      authority: 0.1
    }
  }
}
};
