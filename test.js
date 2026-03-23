#!/usr/bin/env node
/**
 * Test script for the AI Trading Agent.
 *
 * Usage:
 *   node test.js                                # Fresh start, balanced risk
 *   node test.js --scenario holding             # With existing holdings
 *   node test.js --scenario profit              # In profit, take profits?
 *   node test.js --scenario loss                # At a loss, cut or hold?
 *   node test.js --risk degen                   # YOLO mode
 *   node test.js --risk conservative            # Play it safe
 *   node test.js --tokens PEPE,WIF,FLOKI        # Custom token list
 *   node test.js --budget 500                   # Custom budget
 *   node test.js --no-sentiment                 # Skip Twitter (no XAI_API_KEY needed)
 *   node test.js --no-market                    # Skip DexScreener market data
 */

import "dotenv/config";
import { parseArgs } from "node:util";
import OpenAI from "openai";
import { runTradeAgent } from "./agent/agent.js";
import { fetchMultipleTokens } from "./services/market.js";
import { fetchTwitterSentiment } from "./services/sentiment.js";

// ─── CLI ─────────────────────────────────────────────────
const { values } = parseArgs({
  options: {
    scenario:       { type: "string",  default: "fresh" },
    budget:         { type: "string",  default: "100" },
    risk:           { type: "string",  default: "balanced" },
    tokens:         { type: "string",  default: "PEPE,WIF,BONK,DOGE,SHIB" },
    "no-sentiment": { type: "boolean", default: false },
    "no-market":    { type: "boolean", default: false },
  },
});

const budget = parseFloat(values.budget);
const riskLevel = values.risk;
const selectedTokens = values.tokens
  .split(",")
  .map((t) => t.trim().toUpperCase())
  .filter(Boolean);

// ─── Test Scenarios ──────────────────────────────────────
const scenarios = {
  fresh: {
    name: "Fresh Start (USDT only)",
    holdings: [],
  },
  holding: {
    name: "Existing Holdings",
    holdings: [
      { token: "PEPE", amount: 50_000_000, avgBuyPrice: 0.0000012 },
      { token: "WIF",  amount: 25,         avgBuyPrice: 2.1 },
    ],
  },
  profit: {
    name: "In Profit - take profits?",
    holdings: [
      { token: "BONK", amount: 5_000_000,   avgBuyPrice: 0.000005 },
      { token: "PEPE", amount: 100_000_000,  avgBuyPrice: 0.0000005 },
    ],
  },
  loss: {
    name: "At a Loss - cut, hold, or average down?",
    holdings: [
      { token: "WIF",  amount: 50,  avgBuyPrice: 4.5 },
      { token: "DOGE", amount: 500, avgBuyPrice: 0.45 },
    ],
  },
};

const scenario = scenarios[values.scenario] || scenarios.fresh;
const cfg = { budget, riskLevel, selectedTokens, currentHoldings: scenario.holdings };

// ─── Helpers ─────────────────────────────────────────────
const hr = (t) => {
  const line = "\u2500".repeat(56);
  console.log(`\n${line}`);
  if (t) console.log(`  ${t}`);
  console.log(line);
};

const fmtUsd = (n) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
};

// ─── Main ────────────────────────────────────────────────
async function main() {
  console.log(`\n  AI TRADING AGENT - TEST RUN`);
  console.log(`  ${new Date().toLocaleString()}\n`);

  // Print config
  hr("CONFIGURATION");
  console.log(`  Scenario : ${scenario.name}`);
  console.log(`  Budget   : $${cfg.budget.toFixed(2)}`);
  console.log(`  Risk     : ${cfg.riskLevel}`);
  console.log(`  Tokens   : ${cfg.selectedTokens.join(", ")}`);
  if (cfg.currentHoldings.length) {
    console.log(`  Holdings :`);
    for (const h of cfg.currentHoldings)
      console.log(`    ${h.token}: ${h.amount.toLocaleString()} @ $${h.avgBuyPrice}`);
  } else {
    console.log(`  Holdings : None (starting fresh with USDT)`);
  }

  // ─── Market Data ────────────────────────────────────
  let marketData = new Map();
  if (!values["no-market"]) {
    hr("FETCHING MARKET DATA (DexScreener)");
    marketData = await fetchMultipleTokens(cfg.selectedTokens);
    if (marketData.size) {
      for (const [sym, d] of marketData) {
        const sign = d.priceChange24h >= 0 ? "+" : "";
        console.log(
          `  ${sym.padEnd(8)} $${String(d.priceUsd).padEnd(14)} ` +
          `24h: ${sign}${d.priceChange24h}%  ` +
          `Vol: ${fmtUsd(d.volume24h)}  Liq: ${fmtUsd(d.liquidity)}`
        );
      }
    } else {
      console.log("  No market data retrieved.");
    }
  } else {
    console.log("\n  Market data skipped (--no-market)");
  }

  // ─── Sentiment Analysis ──────────────────────────────
  let sentimentData = [];
  if (!values["no-sentiment"]) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      console.log("\n  [!] GROQ_API_KEY not set - skipping sentiment.");
    } else {
      hr("FETCHING SENTIMENT ANALYSIS (Groq)");
      sentimentData = await fetchTwitterSentiment(groqKey, cfg.selectedTokens);
      for (const s of sentimentData) {
        const bar = "\u2588".repeat(Math.max(0, Math.round(s.buzzLevel)));
        console.log(
          `  ${s.token.padEnd(8)} ${s.sentiment.padEnd(14)} Buzz: ${bar} ${s.buzzLevel}/10`
        );
        if (s.summary && s.summary !== "Sentiment data unavailable") {
          console.log(`           ${s.summary}`);
        }
      }
    }
  } else {
    console.log("\n  Sentiment skipped (--no-sentiment)");
  }

  // ─── Run Agent ──────────────────────────────────────
  hr("RUNNING AI AGENT (Groq - Llama 3.3 70B)");
  console.log("  Analyzing and generating trade decisions...\n");

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.error("  ERROR: GROQ_API_KEY not set. Add it to .env file.");
    console.error("  Get a free key at: https://console.groq.com/keys");
    process.exit(1);
  }

  const client = new OpenAI({
    apiKey: groqKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const decision = await runTradeAgent(client, cfg, marketData, sentimentData);

  // ─── Results ────────────────────────────────────────
  hr("TRADE DECISION");
  console.log(`  Should Trade : ${decision.should_trade ? "YES" : "NO"}`);
  console.log(`  Reasoning    : ${decision.reasoning}`);
  if (decision.market_analysis) {
    console.log(`  Market View  : ${decision.market_analysis}`);
  }

  if (decision.actions?.length) {
    hr("ACTIONS");
    for (const a of decision.actions) {
      const tag = a.action === "BUY" ? "[BUY ]" : "[SELL]";
      const conf = `${(a.confidence * 100).toFixed(0)}%`;
      const urg = a.urgency ? ` | ${a.urgency} urgency` : "";
      const amt = a.amount_usd ?? a.amount ?? 0;
      console.log(`  ${tag} ${a.token}  $${amt.toFixed(2)}  (conf: ${conf}${urg})`);
      console.log(`        ${a.reason}`);
    }
  } else {
    console.log("\n  No actions recommended.");
  }

  hr("RAW JSON");
  console.log(JSON.stringify(decision, null, 2));

  hr();
  console.log("  Done!\n");
}

main().catch((err) => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
