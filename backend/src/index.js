import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { initDb } from "./db/database.js";
import authRouter from "./routes/auth.js";
import agentsRouter from "./routes/agents.js";
import tradesRouter from "./routes/trades.js";
import leaderboardRouter from "./routes/leaderboard.js";
import tokensRouter from "./routes/tokens.js";
import { evaluateAllAgents } from "./cron/trader.js";

const app = express();
const PORT = process.env.PORT || 3001;
const CRON_MINUTES = parseInt(process.env.CRON_INTERVAL_MINUTES) || 5;

app.use(cors());
app.use(express.json());

// Initialize database (async for sql.js)
await initDb();
console.log("Database initialized");

// Routes
app.use("/api/auth", authRouter);
app.use("/api/tokens", tokensRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/trades", tradesRouter);
app.use("/api/leaderboard", leaderboardRouter);

// Manual trigger for testing
app.post("/api/evaluate", async (_req, res) => {
  try {
    await evaluateAllAgents();
    res.json({ success: true, message: "Evaluation triggered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Schedule cron job
cron.schedule(`*/${CRON_MINUTES} * * * *`, () => {
  console.log(`[CRON] Running scheduled evaluation (every ${CRON_MINUTES} min)...`);
  evaluateAllAgents().catch((err) =>
    console.error("[CRON] Evaluation failed:", err.message)
  );
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Cron job scheduled every ${CRON_MINUTES} minutes`);
  console.log(`GROQ_API_KEY: ${process.env.GROQ_API_KEY ? "set" : "NOT SET"}`);
});
