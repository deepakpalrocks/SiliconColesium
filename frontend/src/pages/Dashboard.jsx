import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAgents, triggerEvaluation } from "../api/client";
import AgentCard from "../components/AgentCard";

export default function Dashboard({ userId }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  async function loadAgents() {
    try {
      const data = await getAgents(userId);
      setAgents(data);
    } catch (err) {
      console.error("Failed to load agents:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      await triggerEvaluation();
      // Wait a bit then reload
      setTimeout(loadAgents, 3000);
    } catch (err) {
      alert("Evaluation failed: " + err.message);
    } finally {
      setEvaluating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Your AI Agents</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create agents, fund them, and watch them trade autonomously
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEvaluate}
            disabled={evaluating || !agents.length}
            className="px-4 py-2 bg-dark-700 border border-dark-600 rounded text-sm text-gray-300 hover:bg-dark-600 disabled:opacity-50 transition-colors"
          >
            {evaluating ? "Evaluating..." : "Run Evaluation Now"}
          </button>
          <Link
            to="/create"
            className="px-4 py-2 bg-accent-green/20 border border-accent-green/30 rounded text-sm text-accent-green hover:bg-accent-green/30 transition-colors font-medium"
          >
            + Create Agent
          </Link>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-20 bg-dark-800 rounded-lg border border-dark-600">
          <p className="text-gray-400 text-lg mb-2">No agents yet</p>
          <p className="text-gray-600 text-sm mb-6">
            Create your first AI trading agent to get started
          </p>
          <Link
            to="/create"
            className="inline-block px-6 py-2.5 bg-accent-green/20 border border-accent-green/30 rounded text-accent-green hover:bg-accent-green/30 transition-colors font-medium"
          >
            Create Your First Agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
