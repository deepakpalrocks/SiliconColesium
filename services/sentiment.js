/**
 * Twitter/X sentiment analysis via xAI Grok API.
 * Uses Grok's live search to pull real-time X posts about tokens.
 */

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";

/**
 * Analyze Twitter/X sentiment for tokens using xAI Grok with live X search.
 * @param {string} apiKey - xAI API key
 * @param {string[]} tokens - Token symbols to analyze
 * @returns {Promise<import('../models/types.js').TokenSentiment[]>}
 */
export async function fetchTwitterSentiment(apiKey, tokens) {
  try {
    const res = await fetch(XAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          {
            role: "system",
            content: `You are a crypto Twitter/X sentiment analyst. Analyze the current Twitter/X buzz and sentiment for the given meme/crypto tokens.

Respond with valid JSON: { "sentiments": [ ... ] } where each item matches:
{
  "token": "SYMBOL",
  "sentimentScore": number (-1.0 very bearish to 1.0 very bullish),
  "sentiment": "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish",
  "buzzLevel": number (0 to 10, how much discussion right now),
  "keyThemes": ["theme1", "theme2"],
  "summary": "1-2 sentence summary of what X is saying"
}

Focus on:
- Volume of mentions and engagement levels
- Whether buzz is organic or bot-driven
- Key influencers pushing the narrative
- Catalysts: partnerships, listings, burns, whale moves
- Compare to the token's usual baseline buzz`,
          },
          {
            role: "user",
            content: `Analyze current Twitter/X sentiment for these tokens: ${tokens.join(", ")}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        search_parameters: {
          mode: "on",
          sources: [{ type: "x" }],
          max_search_results: 20,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`xAI API ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty xAI response");

    const parsed = JSON.parse(content);
    // Handle different response shapes
    const arr =
      Array.isArray(parsed)
        ? parsed
        : parsed.sentiments || parsed.tokens || parsed.data || [parsed];
    return arr;
  } catch (err) {
    console.warn(`  [!] Twitter sentiment failed: ${err.message}`);
    // Return neutral fallbacks so the agent can still run
    return tokens.map((token) => ({
      token,
      sentimentScore: 0,
      sentiment: "neutral",
      buzzLevel: 0,
      keyThemes: [],
      summary: "Sentiment data unavailable",
    }));
  }
}
