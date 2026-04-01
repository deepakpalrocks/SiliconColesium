/**
 * Cron job that evaluates trade decisions for all active agents.
 */

import OpenAI from "openai";
import { queryAll, queryOne, execute } from "../db/database.js";
import { runTradeAgent } from "../agent/agent.js";
import { fetchMultipleTokens } from "../services/market.js";
import { fetchTwitterSentiment } from "../services/sentiment.js";

export async function evaluateAllAgents() {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.warn("[CRON] No GROQ_API_KEY set, skipping evaluation");
    return;
  }

  const agents = queryAll("SELECT * FROM agents WHERE is_active = 1");
  if (!agents.length) {
    console.log("[CRON] No active agents to evaluate");
    return;
  }

  console.log(`[CRON] Evaluating ${agents.length} active agent(s)...`);

  // Collect all unique tokens
  const allTokens = new Set();
  for (const agent of agents) {
    const tokens = JSON.parse(agent.tokens);
    tokens.forEach((t) => allTokens.add(t));
  }

  console.log(`[CRON] Fetching market data for ${allTokens.size} tokens...`);
  const marketData = await fetchMultipleTokens([...allTokens]);

  console.log("[CRON] Fetching sentiment data...");
  const sentimentData = await fetchTwitterSentiment(groqKey, [...allTokens]);

  const client = new OpenAI({
    apiKey: groqKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  for (const agent of agents) {
    try {
      await evaluateAgent(client, agent, marketData, sentimentData);
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`[CRON] Error evaluating agent ${agent.name}: ${err.message}`);
    }
  }

  console.log("[CRON] Evaluation complete");
}

async function evaluateAgent(client, agent, allMarketData, allSentimentData) {
  const tokens = JSON.parse(agent.tokens);
  const holdings = queryAll("SELECT * FROM holdings WHERE agent_id = ?", [agent.id]);

  const agentMarketData = new Map();
  for (const t of tokens) {
    if (allMarketData.has(t)) agentMarketData.set(t, allMarketData.get(t));
  }

  const agentSentiment = allSentimentData.filter((s) => tokens.includes(s.token));

  const cfg = {
    budget: agent.current_balance,
    riskLevel: agent.risk_level,
    selectedTokens: tokens,
    currentHoldings: holdings.map((h) => ({
      token: h.token,
      amount: h.amount,
      avgBuyPrice: h.avg_buy_price,
    })),
  };

  console.log(`[CRON] Running AI for "${agent.name}" (balance: $${agent.current_balance.toFixed(2)})...`);

  const decision = await runTradeAgent(client, cfg, agentMarketData, agentSentiment, agent.personality);

  // Log the decision
  execute(
    `INSERT INTO decisions (agent_id, should_trade, reasoning, market_analysis, raw_json)
     VALUES (?, ?, ?, ?, ?)`,
    [agent.id, decision.should_trade ? 1 : 0, decision.reasoning, decision.market_analysis || "", JSON.stringify(decision)]
  );

  if (!decision.should_trade || !decision.actions?.length) {
    console.log(`[CRON] "${agent.name}" decided not to trade: ${decision.reasoning}`);
    return;
  }

  for (const action of decision.actions) {
    try {
      executeTrade(agent, action, agentMarketData);
    } catch (err) {
      console.error(`[CRON] Trade execution failed for ${agent.name}/${action.token}: ${err.message}`);
    }
  }
}

function executeTrade(agent, action, marketData) {
  const { action: side, token, amount_usd, confidence, reason } = action;
  const md = marketData.get(token);
  if (!md) {
    console.warn(`[CRON] No market data for ${token}, skipping trade`);
    return;
  }

  const price = md.priceUsd;
  if (!price || price <= 0) {
    console.warn(`[CRON] Invalid price for ${token}, skipping`);
    return;
  }

  if (side === "BUY") {
    const amountUsd = Math.min(amount_usd, agent.current_balance);
    if (amountUsd <= 0) {
      console.warn(`[CRON] Insufficient balance for BUY ${token}`);
      return;
    }

    const tokenAmount = amountUsd / price;

    execute("UPDATE agents SET current_balance = current_balance - ? WHERE id = ?", [amountUsd, agent.id]);
    agent.current_balance -= amountUsd;

    const existing = queryOne("SELECT * FROM holdings WHERE agent_id = ? AND token = ?", [agent.id, token]);
    if (existing) {
      const newAmount = existing.amount + tokenAmount;
      const newAvg = (existing.avg_buy_price * existing.amount + price * tokenAmount) / newAmount;
      execute("UPDATE holdings SET amount = ?, avg_buy_price = ? WHERE id = ?", [newAmount, newAvg, existing.id]);
    } else {
      execute("INSERT INTO holdings (agent_id, token, amount, avg_buy_price) VALUES (?, ?, ?, ?)", [agent.id, token, tokenAmount, price]);
    }

    execute(
      `INSERT INTO trades (agent_id, action, token, amount_usd, price, token_amount, confidence, reasoning)
       VALUES (?, 'BUY', ?, ?, ?, ?, ?, ?)`,
      [agent.id, token, amountUsd, price, tokenAmount, confidence, reason]
    );

    console.log(`[CRON] BUY ${token}: $${amountUsd.toFixed(2)} @ $${price}`);
  } else if (side === "SELL") {
    const holding = queryOne("SELECT * FROM holdings WHERE agent_id = ? AND token = ?", [agent.id, token]);
    if (!holding || holding.amount <= 0) {
      console.warn(`[CRON] No holdings to sell for ${token}`);
      return;
    }

    const maxSellUsd = holding.amount * price;
    const sellUsd = Math.min(amount_usd, maxSellUsd);
    const sellTokens = sellUsd / price;
    const remainingTokens = holding.amount - sellTokens;

    execute("UPDATE agents SET current_balance = current_balance + ? WHERE id = ?", [sellUsd, agent.id]);
    agent.current_balance += sellUsd;

    if (remainingTokens <= 0.000001) {
      execute("DELETE FROM holdings WHERE id = ?", [holding.id]);
    } else {
      execute("UPDATE holdings SET amount = ? WHERE id = ?", [remainingTokens, holding.id]);
    }

    execute(
      `INSERT INTO trades (agent_id, action, token, amount_usd, price, token_amount, confidence, reasoning)
       VALUES (?, 'SELL', ?, ?, ?, ?, ?, ?)`,
      [agent.id, token, sellUsd, price, sellTokens, confidence, reason]
    );

    console.log(`[CRON] SELL ${token}: $${sellUsd.toFixed(2)} @ $${price}`);
  }
}
