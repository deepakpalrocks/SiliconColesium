                                                                                                                                                       Silicon Coliseum - AI Agent Trading Platform (MVP)                                                                                                          
                                                                                                                                                                Architecture                                                                                                                                                                                                                                                                                                                backend/                    # Express + SQLite (sql.js) + Groq AI                                                                                             ├── src/                                                                                                                                                    
  │   ├── index.js           # Express server + cron scheduler
  │   ├── db/database.js     # SQLite with sql.js (WASM, no native deps)
  │   ├── agent/agent.js     # AI trade decision engine (Groq/Llama 3.3 70B)
  │   ├── services/
  │   │   ├── market.js      # DexScreener live prices (free API)
  │   │   └── sentiment.js   # Sentiment analysis via Groq
  │   ├── routes/
  │   │   ├── agents.js      # CRUD for AI agents
  │   │   ├── trades.js      # Trade history
  │   │   ├── leaderboard.js # Ranked agents by PnL
  │   │   └── tokens.js      # Predetermined token list (12 meme tokens)
  │   └── cron/trader.js     # Periodic AI evaluation + trade execution

  frontend/                   # React + Vite + Tailwind CSS
  ├── src/
  │   ├── pages/
  │   │   ├── Dashboard.jsx     # Your agents overview
  │   │   ├── CreateAgent.jsx   # Create agent form
  │   │   ├── AgentDetail.jsx   # Agent stats, holdings, trades, decisions
  │   │   └── Leaderboard.jsx   # All agents ranked by PnL
  │   ├── components/
  │   │   ├── Navbar.jsx
  │   │   ├── AgentCard.jsx
  │   │   └── TradeList.jsx
  │   └── api/client.js      # API client

  How It Works

  1. Create Agent - Pick a name, risk level (conservative/balanced/aggressive/degen), budget, tokens from the predetermined list, and optional personality    
  instructions
  2. Cron Job (every 5 min) - For each active agent, fetches live market data from DexScreener + sentiment via Groq, then asks the AI to decide on trades     
  3. AI Decides - The Llama 3.3 70B model analyzes prices, momentum, volume, liquidity, sentiment, and returns structured JSON with buy/sell actions
  4. Paper Trading - Trades are simulated in SQLite (balance, holdings, trade history)
  5. Leaderboard - Agents ranked by PnL% using live prices

  Tested and Verified

  - Backend starts, DB initializes
  - Agent creation works
  - AI evaluation works - the test agent bought BONK ($40), PEPE ($30), WIF ($30) with confidence scores and reasoning
  - Frontend builds cleanly

  How to Run

  # Terminal 1 - Backend
  cd backend
  cp .env.example .env   # Add your GROQ_API_KEY
  npm start

  # Terminal 2 - Frontend
  cd frontend
  npm run dev
  # Open http://localhost:5173

  How to Deploy

  Simplest (Railway/Render):
  - Backend: Deploy backend/ as a Node.js service. Set GROQ_API_KEY env var. The cron job runs inside the process.
  - Frontend: Deploy frontend/ as a static site (npm run build → serve dist/). Set the Vite proxy to your backend URL (or update api/client.js to use the full
   backend URL).

  Cheapest (VPS - DigitalOcean $4/mo or Hetzner):
  - Run both on one server with PM2 + nginx reverse proxy
  - Backend on port 3001, frontend built static served by nginx

  Free tier:
  - Backend on Render free tier (spins down after inactivity, cron won't run 24/7)
  - Frontend on Vercel or Netlify (free static hosting)
  - For reliable cron, use an external service like cron-job.org to hit POST /api/evaluate every 5 minutes
