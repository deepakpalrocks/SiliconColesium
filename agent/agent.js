/**
 * Enhanced AI trading agent.
 * Combines market data, Twitter sentiment, and portfolio state
 * to produce structured trade decisions via Google Gemini.
 */

/**
 * System prompt with trading strategies.
 */
function systemPrompt() {
  return `You are an expert meme/crypto token trading advisor AI. You analyze real market data, Twitter/X sentiment, and portfolio state to make trading decisions.

You MUST respond with valid JSON matching this exact schema:
{
  "should_trade": boolean,
  "reasoning": "string explaining your overall analysis",
  "market_analysis": "brief analysis of current market conditions",
  "actions": [
    {
      "action": "BUY" or "SELL",
      "token": "TOKEN_SYMBOL",
      "amount_usd": number (USD value to trade),
      "confidence": number (0.0 to 1.0),
      "urgency": "low" | "medium" | "high",
      "reason": "string explaining this specific action"
    }
  ]
}

TRADING STRATEGIES:

1. TREND DETECTION
   - 5m AND 1h both positive + rising volume -> potential early rally, consider buying
   - Pumped >50% in 24h and 1h momentum slowing -> possible top, consider selling
   - Price down significantly but sentiment turning positive -> potential reversal, watch/buy

2. SENTIMENT-DRIVEN
   - High buzz (7+) + positive sentiment + early price rise -> strong buy signal
   - Declining buzz + price still rising -> distribution phase, be cautious
   - Negative sentiment + price dropping -> avoid or sell
   - Buzz spike with flat price -> incoming pump potential, small position ok

3. LIQUIDITY AWARENESS
   - If trade amount > 2% of pool liquidity -> reduce position to avoid slippage
   - Liquidity < $50K -> tiny positions only, regardless of other signals
   - High liquidity -> more confidence in execution quality

4. RISK MANAGEMENT
   - Max 30% of budget in single token (unless degen)
   - Holding at > -20% loss -> consider cutting unless sentiment is recovering
   - Holding at > +50% profit -> consider partial profit-taking
   - Keep reserve budget for dip-buying opportunities

RISK LEVEL BEHAVIOR:
- conservative: High-confidence only (>0.7), 5-15% positions, need trend+sentiment alignment
- balanced: Medium+ confidence (>0.5), 10-25% positions, some speculative plays ok
- aggressive: Lower confidence ok (>0.3), 15-40% positions, lean into momentum
- degen: Any positive signal, up to 50%+ positions, chase pumps, embrace volatility

RULES:
- Total BUY amounts MUST NOT exceed available budget
- Can only SELL tokens present in current holdings
- If no good opportunities -> should_trade: false, empty actions
- Always ground your reasoning in the actual data provided`;
}

/**
 * Build user prompt with all available data.
 * @param {import('../models/types.js').TradingConfig} cfg
 * @param {Map<string, import('../models/types.js').TokenMarketData>} marketData
 * @param {import('../models/types.js').TokenSentiment[]} sentimentData
 */
function buildPrompt(cfg, marketData, sentimentData) {
  let p = `=== TRADING SESSION ===\n\n`;
  p += `Budget: $${cfg.budget.toFixed(2)} USD\n`;
  p += `Risk Level: ${cfg.riskLevel}\n`;
  p += `Tokens: ${cfg.selectedTokens.join(", ")}\n\n`;

  // Holdings
  p += `=== CURRENT HOLDINGS ===\n`;
  if (cfg.currentHoldings.length > 0) {
    for (const h of cfg.currentHoldings) {
      const md = marketData?.get(h.token);
      const curPrice = md?.priceUsd || 0;
      const curValue = curPrice * h.amount;
      const pnl =
        curPrice > 0
          ? ((curPrice - h.avgBuyPrice) / h.avgBuyPrice) * 100
          : 0;

      p += `${h.token}: ${h.amount.toLocaleString()} units @ avg $${h.avgBuyPrice}\n`;
      if (curPrice > 0) {
        p += `  Current price: $${curPrice} | Value: $${curValue.toFixed(2)} | P&L: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%\n`;
      }
    }
  } else {
    p += `None (fresh start with USDT only)\n`;
  }

  // Market data
  p += `\n=== LIVE MARKET DATA ===\n`;
  if (marketData && marketData.size > 0) {
    for (const [sym, d] of marketData) {
      p += `\n${sym} (${d.name}):\n`;
      p += `  Price: $${d.priceUsd}\n`;
      p += `  5min: ${fmt(d.priceChange5m)}% | 1h: ${fmt(d.priceChange1h)}% | 6h: ${fmt(d.priceChange6h)}% | 24h: ${fmt(d.priceChange24h)}%\n`;
      p += `  24h Volume: ${fmtN(d.volume24h)} | Liquidity: ${fmtN(d.liquidity)}`;
      if (d.marketCap) p += ` | MCap: ${fmtN(d.marketCap)}`;
      p += `\n`;
    }
  } else {
    p += `No market data available - be conservative.\n`;
  }

  // Sentiment
  p += `\n=== TWITTER/X SENTIMENT ===\n`;
  if (sentimentData && sentimentData.length > 0) {
    for (const s of sentimentData) {
      p += `${s.token}: ${s.sentiment} (score: ${s.sentimentScore}, buzz: ${s.buzzLevel}/10)\n`;
      if (s.keyThemes?.length) p += `  Themes: ${s.keyThemes.join(", ")}\n`;
      p += `  ${s.summary}\n`;
    }
  } else {
    p += `No sentiment data available.\n`;
  }

  p += `\nAnalyze ALL data above and provide your trading decision as JSON.`;
  return p;
}

function fmt(n) {
  return (n >= 0 ? "+" : "") + n;
}
function fmtN(n) {
  if (!n) return "$0";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(2) + "K";
  return "$" + n.toFixed(2);
}

/**
 * Run the trading agent using Groq (OpenAI-compatible API).
 * @param {import('openai').default} client - OpenAI-compatible client
 * @param {import('../models/types.js').TradingConfig} cfg
 * @param {Map<string, any>} [marketData] - Token market data (optional)
 * @param {any[]} [sentimentData] - Twitter sentiment (optional)
 * @returns {Promise<import('../models/types.js').TradeDecision>}
 */
export async function runTradeAgent(
  client,
  cfg,
  marketData = new Map(),
  sentimentData = []
) {
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: buildPrompt(cfg, marketData, sentimentData) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const choice = response.choices[0];
  if (!choice) throw new Error("No response from Groq");

  const raw = choice.message.content;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse trade decision: ${err.message}\nRaw: ${raw}`
    );
  }
}
