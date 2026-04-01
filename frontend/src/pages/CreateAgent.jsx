import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTokens, createAgent } from "../api/client";

const RISK_OPTIONS = [
  {
    value: "conservative",
    label: "Conservative",
    desc: "High-confidence trades only, small positions",
    color: "text-blue-400 border-blue-400/30",
  },
  {
    value: "balanced",
    label: "Balanced",
    desc: "Medium+ confidence, moderate positions",
    color: "text-yellow-400 border-yellow-400/30",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    desc: "Lower confidence OK, larger positions",
    color: "text-orange-400 border-orange-400/30",
  },
  {
    value: "degen",
    label: "Degen",
    desc: "Chase pumps, max volatility, YOLO",
    color: "text-red-400 border-red-400/30",
  },
];

export default function CreateAgent({ userId }) {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState([]);
  const [form, setForm] = useState({
    name: "",
    risk_level: "balanced",
    budget: 100,
    tokens: [],
    personality: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getTokens().then(setTokens).catch(console.error);
  }, []);

  function toggleToken(symbol) {
    setForm((prev) => ({
      ...prev,
      tokens: prev.tokens.includes(symbol)
        ? prev.tokens.filter((t) => t !== symbol)
        : [...prev.tokens, symbol],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Name is required");
    if (!form.tokens.length) return setError("Select at least one token");
    if (form.budget < 10) return setError("Minimum budget is $10");

    setSubmitting(true);
    try {
      const agent = await createAgent({ ...form, user_id: userId });
      navigate(`/agent/${agent.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Create AI Agent</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Agent Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Moon Hunter, Dip Buyer, Diamond Hands..."
            className="w-full bg-dark-800 border border-dark-600 rounded px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-accent-green/50"
          />
        </div>

        {/* Risk Level */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Risk Level
          </label>
          <div className="grid grid-cols-2 gap-2">
            {RISK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, risk_level: opt.value })}
                className={`p-3 rounded border text-left transition-all ${
                  form.risk_level === opt.value
                    ? `${opt.color} bg-dark-700`
                    : "border-dark-600 text-gray-400 hover:border-dark-500"
                }`}
              >
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Budget (USD)
          </label>
          <input
            type="number"
            value={form.budget}
            onChange={(e) =>
              setForm({ ...form, budget: parseFloat(e.target.value) || 0 })
            }
            min={10}
            max={100000}
            step={10}
            className="w-full bg-dark-800 border border-dark-600 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-accent-green/50"
          />
          <p className="text-xs text-gray-600 mt-1">
            Simulated paper trading balance ($10 - $100,000)
          </p>
        </div>

        {/* Token Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tokens to Trade ({form.tokens.length} selected)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {tokens.map((token) => (
              <button
                key={token.symbol}
                type="button"
                onClick={() => toggleToken(token.symbol)}
                className={`px-3 py-2 rounded border text-sm font-mono transition-all ${
                  form.tokens.includes(token.symbol)
                    ? "border-accent-green/50 bg-accent-green/10 text-accent-green"
                    : "border-dark-600 text-gray-400 hover:border-dark-500"
                }`}
              >
                {token.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Personality */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Agent Personality (optional)
          </label>
          <textarea
            value={form.personality}
            onChange={(e) => setForm({ ...form, personality: e.target.value })}
            placeholder="e.g. Focus on momentum plays. Always take profits at 30%+ gains. Avoid tokens with less than $100K liquidity..."
            rows={3}
            className="w-full bg-dark-800 border border-dark-600 rounded px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-accent-green/50 text-sm"
          />
          <p className="text-xs text-gray-600 mt-1">
            Custom instructions that shape how the AI makes trading decisions
          </p>
        </div>

        {error && (
          <p className="text-accent-red text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-accent-green/20 border border-accent-green/30 rounded text-accent-green font-medium hover:bg-accent-green/30 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Creating..." : "Deploy Agent"}
        </button>
      </form>
    </div>
  );
}
