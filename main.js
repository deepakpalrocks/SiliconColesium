import "dotenv/config";
import { parseArgs } from "node:util";
import OpenAI from "openai";
import { runTradeAgent } from "./agent/agent.js";

// --- CLI argument parsing ---
const { values } = parseArgs({
  options: {
    budget: { type: "string", default: "100" },
    risk: { type: "string", default: "balanced" },
    tokens: { type: "string", default: "PEPE,WIF,BONK" },
    holdings: { type: "string", default: "" },
  },
});

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error("Error: GROQ_API_KEY environment variable is required");
  process.exit(1);
}

// --- Parse inputs ---
const budget = parseFloat(values.budget);
if (isNaN(budget)) {
  console.error("Error: --budget must be a number");
  process.exit(1);
}

const riskLevel = values.risk;
const validRisks = ["conservative", "balanced", "aggressive", "degen"];
if (!validRisks.includes(riskLevel)) {
  console.error(`Error: --risk must be one of: ${validRisks.join(", ")}`);
  process.exit(1);
}

const selectedTokens = values.tokens
  .split(",")
  .map((t) => t.trim().toUpperCase())
  .filter(Boolean);

const currentHoldings = parseHoldings(values.holdings);

const cfg = { budget, riskLevel, selectedTokens, currentHoldings };

// --- Print config ---
console.log("Running AI Trade Agent...");
console.log(`  Budget:  $${cfg.budget.toFixed(2)}`);
console.log(`  Risk:    ${cfg.riskLevel}`);
console.log(`  Tokens:  ${cfg.selectedTokens.join(", ")}`);
if (cfg.currentHoldings.length > 0) {
  console.log("  Holdings:");
  for (const h of cfg.currentHoldings) {
    console.log(`    - ${h.token}: ${h.amount} @ $${h.avgBuyPrice}`);
  }
}
console.log();

// --- Run agent ---
const client = new OpenAI({
  apiKey,
  baseURL: "https://api.groq.com/openai/v1",
});

try {
  const decision = await runTradeAgent(client, cfg);
  console.log("Trade Decision:");
  console.log(JSON.stringify(decision, null, 2));
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}

/**
 * Parse holdings string like "PEPE:1000:0.000001,WIF:50:2.5"
 * @param {string} s
 * @returns {import('./models/types.js').Holding[]}
 */
function parseHoldings(s) {
  if (!s) return [];
  const holdings = [];
  for (const entry of s.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(":");
    if (parts.length !== 3) {
      console.warn(`Warning: skipping malformed holding "${trimmed}" (expected TOKEN:AMOUNT:AVGPRICE)`);
      continue;
    }
    const amount = parseFloat(parts[1]);
    const avgBuyPrice = parseFloat(parts[2]);
    if (isNaN(amount) || isNaN(avgBuyPrice)) {
      console.warn(`Warning: skipping holding "${trimmed}": invalid number`);
      continue;
    }
    holdings.push({
      token: parts[0].trim().toUpperCase(),
      amount,
      avgBuyPrice,
    });
  }
  return holdings;
}
