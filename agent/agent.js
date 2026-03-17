/**
 * Builds the system prompt for the trading advisor.
 */
function systemPrompt() {
  return `You are a meme token trading advisor AI. You analyze trading configurations and return structured trading decisions.

You MUST respond with valid JSON matching this exact schema:
{
  "should_trade": boolean,
  "reasoning": "string explaining your overall analysis",
  "actions": [
    {
      "action": "BUY" or "SELL",
      "token": "TOKEN_SYMBOL",
      "amount": number (USD amount to trade),
      "confidence": number (0.0 to 1.0),
      "reason": "string explaining this specific action"
    }
  ]
}

Rules:
- Total buy amounts must not exceed the available budget
- Confidence should reflect how speculative the trade is
- For conservative risk: prefer small positions, high confidence only
- For balanced risk: moderate positions, mixed confidence
- For aggressive risk: larger positions, willing to take lower confidence trades
- For degen risk: YOLO positions, ape in on hype
- If no good trades exist, set should_trade to false with empty actions
- Consider current holdings when making decisions (avoid overexposure)`;
}

/**
 * Builds the user prompt from the trading config.
 * @param {import('../models/types.js').TradingConfig} cfg
 */
function buildPrompt(cfg) {
  let prompt = `Trading Configuration:\n`;
  prompt += `- Budget: $${cfg.budget.toFixed(2)} USD\n`;
  prompt += `- Risk Level: ${cfg.riskLevel}\n`;
  prompt += `- Tokens to Consider: ${cfg.selectedTokens.join(", ")}\n`;

  if (cfg.currentHoldings.length > 0) {
    prompt += `\nCurrent Holdings:\n`;
    for (const h of cfg.currentHoldings) {
      prompt += `- ${h.token}: ${h.amount.toFixed(4)} units @ avg buy price $${h.avgBuyPrice.toFixed(8)}\n`;
    }
  } else {
    prompt += `\nCurrent Holdings: None\n`;
  }

  prompt += `\nBased on this configuration, provide your trading decision as JSON.`;
  return prompt;
}

/**
 * Calls OpenAI and returns a structured trade decision.
 * @param {import('openai').default} client
 * @param {import('../models/types.js').TradingConfig} cfg
 * @returns {Promise<import('../models/types.js').TradeDecision>}
 */
export async function runTradeAgent(client, cfg) {
  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: buildPrompt(cfg) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const choice = response.choices[0];
  if (!choice) {
    throw new Error("No choices returned from OpenAI");
  }

  const raw = choice.message.content;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse LLM response as TradeDecision: ${err.message}\nraw response: ${raw}`);
  }
}
