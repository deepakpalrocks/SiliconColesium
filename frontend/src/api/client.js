const API_BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// Auth
export const checkWallet = (wallet_address) =>
  request("/auth/check", { method: "POST", body: JSON.stringify({ wallet_address }) });
export const signup = (data) =>
  request("/auth/signup", { method: "POST", body: JSON.stringify(data) });

// Tokens
export const getTokens = () => request("/tokens");
export const getTokenPrices = () => request("/tokens/prices");

// Agents
export const getAgents = (userId) =>
  request(userId ? `/agents?user_id=${userId}` : "/agents");
export const getAgent = (id) => request(`/agents/${id}`);
export const createAgent = (data) =>
  request("/agents", { method: "POST", body: JSON.stringify(data) });
export const toggleAgent = (id) =>
  request(`/agents/${id}/toggle`, { method: "PATCH" });
export const deleteAgent = (id) =>
  request(`/agents/${id}`, { method: "DELETE" });

// Trades
export const getAgentTrades = (agentId, limit = 50) =>
  request(`/trades/${agentId}?limit=${limit}`);

// Leaderboard
export const getLeaderboard = () => request("/leaderboard");

// Manual trigger
export const triggerEvaluation = () =>
  request("/evaluate", { method: "POST" });
