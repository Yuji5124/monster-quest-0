// Anthropic (Claude) provider (Phase 3) - the ONE real provider implemented in
// this phase (§12: "start with one, keep it swappable"). Only transport logic
// lives here; MQ0-specific prompt/schema instructions come from
// lib/mq0-reviewer-prompt.js via the reviewRequest.instructions field, and the
// request shape itself comes from lib/review-request-builder.js - this file never
// builds MQ0-specific content itself.
//
// The API key is read ONLY from process.env.ANTHROPIC_API_KEY. It is never
// written to config.js, the repository, or any Review Package / AI Review Result.
"use strict";
const AiConfig = require("../lib/ai-config.js");

const NAME = "anthropic";
const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

function isConfigured() {
    return !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
}

// The model is instructed to return ONLY JSON, but this defensively strips code
// fences or stray prose in case it doesn't, rather than failing outright.
function extractJson(text) {
    if (!text) return null;
    let candidate = text.trim();
    const fenceMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) candidate = fenceMatch[1].trim();
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        candidate = candidate.slice(firstBrace, lastBrace + 1);
    }
    try {
        return JSON.parse(candidate);
    } catch (e) {
        return null;
    }
}

function buildMessageContent(reviewRequest) {
    const content = [];
    const textPayload = JSON.stringify({
        project: reviewRequest.project,
        map: reviewRequest.map,
        layers: reviewRequest.layers,
        objects: reviewRequest.objects,
        validation: reviewRequest.validation,
        requirementsContext: reviewRequest.requirementsContext,
        reference: {
            configured: reviewRequest.reference.configured,
            layer: reviewRequest.reference.layer,
            path: reviewRequest.reference.path,
            opacity: reviewRequest.reference.opacity,
            visible: reviewRequest.reference.visible,
            hasImageAttached: !!reviewRequest.reference.imagePayload
        }
    }, null, 2);

    content.push({ type: "text", text: "Review Package (JSON):\n" + textPayload });

    if (reviewRequest.reference.imagePayload) {
        content.push({
            type: "image",
            source: {
                type: "base64",
                media_type: reviewRequest.reference.imagePayload.mediaType,
                data: reviewRequest.reference.imagePayload.base64
            }
        });
        content.push({ type: "text", text: "The image above is this map's Reference Image layer. Compare it against the map data above." });
    }

    return content;
}

async function callOnce(reviewRequest, cfg, apiKey) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": ANTHROPIC_VERSION,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                model: cfg.defaultModel,
                max_tokens: cfg.maxOutputTokens,
                system: reviewRequest.instructions,
                messages: [{ role: "user", content: buildMessageContent(reviewRequest) }]
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            const bodyText = await response.text().catch(() => "");
            const err = new Error("Anthropic API error " + response.status + ": " + bodyText.slice(0, 300));
            err.status = response.status;
            throw err;
        }

        const json = await response.json();
        const textBlock = (json.content || []).find((b) => b.type === "text");
        const raw = textBlock ? textBlock.text : "";
        const parsed = extractJson(raw);
        return { raw, parsed, error: parsed ? null : "Model response was not valid JSON matching the AI Review Result schema." };
    } finally {
        clearTimeout(timer);
    }
}

// options.providerConfig lets tests inject a fast/fake config; defaults to ai-config.js.
async function review(reviewRequest, options) {
    options = options || {};
    const cfg = options.providerConfig || AiConfig.provider;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return { raw: null, parsed: null, error: "ANTHROPIC_API_KEY is not set." };
    }

    let lastError = null;
    const attempts = Math.max(1, (cfg.maxRetries || 0) + 1); // §22: hard-capped, no unbounded retry
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await callOnce(reviewRequest, cfg, apiKey);
        } catch (e) {
            lastError = e;
            const retryable = e.name === "AbortError" || e.status === 429 || (e.status >= 500 && e.status < 600);
            if (!retryable || attempt === attempts) break;
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
    }

    const message = lastError ? (lastError.message || String(lastError)) : "Unknown provider error.";
    return { raw: null, parsed: null, error: message };
}

module.exports = { name: NAME, isConfigured, review };
