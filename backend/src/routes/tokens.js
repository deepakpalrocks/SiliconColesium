import { Router } from "express";
import { fetchMultipleTokens } from "../services/market.js";

const router = Router();

// Predetermined token list for the protocol
const AVAILABLE_TOKENS = [
  { symbol: "PEPE", name: "Pepe", chain: "ethereum", category: "meme" },
  { symbol: "WIF", name: "dogwifhat", chain: "solana", category: "meme" },
  { symbol: "BONK", name: "Bonk", chain: "solana", category: "meme" },
  { symbol: "DOGE", name: "Dogecoin", chain: "multi", category: "meme" },
  { symbol: "SHIB", name: "Shiba Inu", chain: "ethereum", category: "meme" },
  { symbol: "FLOKI", name: "Floki", chain: "ethereum", category: "meme" },
  { symbol: "BRETT", name: "Brett", chain: "base", category: "meme" },
  { symbol: "POPCAT", name: "Popcat", chain: "solana", category: "meme" },
  { symbol: "MEW", name: "cat in a dogs world", chain: "solana", category: "meme" },
  { symbol: "TURBO", name: "Turbo", chain: "ethereum", category: "meme" },
  { symbol: "MOG", name: "Mog Coin", chain: "ethereum", category: "meme" },
  { symbol: "PENGU", name: "Pudgy Penguins", chain: "solana", category: "meme" },
];

// GET /api/tokens - list all available tokens
router.get("/", (_req, res) => {
  res.json(AVAILABLE_TOKENS);
});

// GET /api/tokens/prices - get live prices for all tokens
router.get("/prices", async (_req, res) => {
  try {
    const symbols = AVAILABLE_TOKENS.map((t) => t.symbol);
    const marketData = await fetchMultipleTokens(symbols);
    const prices = {};
    for (const [sym, data] of marketData) {
      prices[sym] = data;
    }
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
export { AVAILABLE_TOKENS };
