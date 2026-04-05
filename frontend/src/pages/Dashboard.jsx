import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAgents, triggerEvaluation } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AgentCard from "../components/AgentCard";


export default function Dashboard() {
  const { user, isRegistered, isConnected, walletAddress, tokenBalance, connectWallet, signUp, connecting } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signing, setSigning] = useState(false);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 30000);
    return () => clearInterval(interval);
  }, [user]);

  async function loadAgents() {
    try {
      const data = await getAgents(user?.id);
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

  async function handleConnect() {
    try {
      const result = await connectWallet();
      if (!result.registered) setShowSignup(true);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setSignupError("");
    const trimmed = username.trim();
    if (trimmed.length < 2) { setSignupError("Username must be at least 2 characters"); return; }
    setSigning(true);
    try {
      await signUp(trimmed);
      setShowSignup(false);
      setUsername("");
    } catch (err) {
      setSignupError(err.message);
    } finally {
      setSigning(false);
    }
  }

  if (!isRegistered) {
    return (
      <>
        <div className="text-center py-20 bg-dark-800 rounded-lg border border-dark-600">
          <p className="text-gray-400 text-lg mb-2">Welcome to Silicon Coliseum</p>
          <p className="text-gray-600 text-sm mb-6">
            Connect your wallet and sign up to create your AI trading agent
          </p>
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-6 py-2.5 bg-accent-purple/20 border border-accent-purple/30 rounded text-purple-300 hover:bg-accent-purple/30 transition-colors font-medium disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-gray-500 font-mono">{walletAddress}</span>
              <button
                onClick={() => setShowSignup(true)}
                className="px-6 py-2.5 bg-accent-green/20 border border-accent-green/30 rounded text-accent-green hover:bg-accent-green/30 transition-colors font-medium"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {showSignup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold text-white mb-1">Sign Up</h2>
              <p className="text-gray-500 text-sm mb-4">
                Choose a username and sign with your wallet to verify ownership.
              </p>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    maxLength={30}
                    className="w-full bg-dark-900 border border-dark-600 rounded px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-accent-green/50"
                    autoFocus
                  />
                </div>
                <div className="bg-dark-900 border border-dark-600 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">Connected wallet</p>
                  <p className="text-sm text-gray-300 font-mono break-all">{walletAddress}</p>
                </div>
                <p className="text-xs text-gray-500">
                  Clicking &quot;Sign &amp; Register&quot; will open MetaMask to sign a confirmation message. No gas fees involved.
                </p>
                {signupError && <p className="text-accent-red text-sm">{signupError}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowSignup(false); setSignupError(""); }}
                    className="flex-1 py-2.5 border border-dark-600 rounded text-gray-400 hover:bg-dark-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={signing || !username.trim()}
                    className="flex-1 py-2.5 bg-accent-green/20 border border-accent-green/30 rounded text-accent-green font-medium hover:bg-accent-green/30 disabled:opacity-50 transition-colors text-sm"
                  >
                    {signing ? "Signing..." : "Sign & Register"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  const canCreateMore = tokenBalance > agents.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Your AI Agents</h1>
          <p className="text-gray-500 text-sm mt-1">
            <span className="text-yellow-400 font-mono">{tokenBalance} SCT</span>
            {" "}&middot;{" "}
            {agents.length} / {tokenBalance} agent slots used
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
            to="/buy-tokens"
            className="px-4 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded text-sm text-yellow-400 hover:bg-yellow-400/20 transition-colors font-medium"
          >
            Buy Tokens
          </Link>
          {canCreateMore && (
            <Link
              to="/create"
              className="px-4 py-2 bg-accent-green/20 border border-accent-green/30 rounded text-sm text-accent-green hover:bg-accent-green/30 transition-colors font-medium"
            >
              + Create Agent
            </Link>
          )}
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
