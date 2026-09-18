// Non-secret tuning knobs for Phase 3 AI Review. NEVER put an API key here -
// keys are read only from environment variables (see providers/anthropic-provider.js).
"use strict";

module.exports = {
    schemaVersion: "0.1.0",

    // Requirements Context Builder (§7/§8): hard caps so a huge Markdown file is
    // never dumped whole into an AI request.
    context: {
        maxFiles: 5,
        maxExcerptCharsPerFile: 1200,
        maxTotalContextChars: 6000
    },

    // Provider call limits (§22: usage/cost protection). One map, one explicit
    // review, no auto-loop, a small hard-capped retry count.
    provider: {
        timeoutMs: 60000,
        maxRetries: 1, // total attempts = maxRetries + 1
        defaultModel: process.env.MQ0_AI_MODEL || "claude-sonnet-5",
        maxOutputTokens: 2000
    },

    resultsDir: "tools/mq0-map-ai/reviews",
    reviewPackagesDir: "tools/mq0-map-ai/review-packages",
    examplesDir: "tools/mq0-map-ai/examples"
};
