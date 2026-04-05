import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract, parseUnits } from "ethers";
import { useAuth } from "../context/AuthContext";
import {
  SCT_CONTRACT_ADDRESS,
  USDT_CONTRACT_ADDRESS,
  SCT_ABI,
  USDT_ABI,
  TIERS,
  ARBITRUM_CHAIN_ID,
  ARBITRUM_CHAIN_ID_HEX,
  ARBITRUM_CHAIN_CONFIG,
} from "../config/contract";

export default function BuyTokens() {
  const { walletAddress, isRegistered } = useAuth();
  const [sctBalance, setSctBalance] = useState(null);
  const [usdtBalance, setUsdtBalance] = useState(null);
  const [buying, setBuying] = useState(false);
  const [activeTier, setActiveTier] = useState(null);
  const [txStatus, setTxStatus] = useState("");
  const [error, setError] = useState("");

  const loadBalances = useCallback(async () => {
    if (!walletAddress || !window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const sctContract = new Contract(SCT_CONTRACT_ADDRESS, SCT_ABI, provider);
      const usdtContract = new Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);

      const [sctBal, usdtBal] = await Promise.all([
        sctContract.wholeTokenBalance(walletAddress),
        usdtContract.balanceOf(walletAddress),
      ]);
      setSctBalance(Number(sctBal));
      setUsdtBalance(Number(usdtBal) / 1e6); // USDT has 6 decimals
    } catch {
      setSctBalance(0);
      setUsdtBalance(0);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  async function ensureArbitrumNetwork() {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) !== ARBITRUM_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ARBITRUM_CHAIN_ID_HEX }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [ARBITRUM_CHAIN_CONFIG],
          });
        } else {
          throw switchError;
        }
      }
    }
  }

  async function handlePurchase(tier) {
    setError("");
    setTxStatus("");
    setBuying(true);
    setActiveTier(tier.id);

    try {
      await ensureArbitrumNetwork();

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const usdtContract = new Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);
      const sctContract = new Contract(SCT_CONTRACT_ADDRESS, SCT_ABI, signer);

      const usdtAmount = parseUnits(String(tier.usdtCost), 6); // USDT 6 decimals

      // Check allowance
      setTxStatus("Checking USDT allowance...");
      const currentAllowance = await usdtContract.allowance(walletAddress, SCT_CONTRACT_ADDRESS);

      if (currentAllowance < usdtAmount) {
        setTxStatus("Approving USDT spend... (confirm in MetaMask)");
        const approveTx = await usdtContract.approve(SCT_CONTRACT_ADDRESS, usdtAmount);
        setTxStatus("Waiting for approval confirmation...");
        await approveTx.wait();
      }

      // Purchase tokens
      setTxStatus("Purchasing SCT tokens... (confirm in MetaMask)");
      const purchaseTx = await sctContract.purchaseTokens(tier.id);
      setTxStatus("Waiting for transaction confirmation...");
      await purchaseTx.wait();

      setTxStatus("Purchase complete!");
      await loadBalances();

      setTimeout(() => setTxStatus(""), 3000);
    } catch (err) {
      const msg = err.reason || err.message || "Transaction failed";
      setError(msg.length > 200 ? msg.slice(0, 200) + "..." : msg);
    } finally {
      setBuying(false);
      setActiveTier(null);
    }
  }

  if (!isRegistered) {
    return (
      <div className="text-center py-20 bg-dark-800 rounded-lg border border-dark-600 max-w-2xl mx-auto">
        <p className="text-gray-400 text-lg mb-2">Authentication Required</p>
        <p className="text-gray-600 text-sm">
          Connect your wallet and sign up to purchase SCT tokens.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Buy SCT Tokens</h1>
      <p className="text-gray-500 text-sm mb-6">
        Each AI agent requires 1 SCT token. Buy in bulk for better value.
      </p>

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">SCT Balance</p>
          <p className="text-2xl font-bold text-accent-green font-mono">
            {sctBalance !== null ? sctBalance : "..."}
          </p>
          <p className="text-gray-600 text-xs mt-1">
            = {sctBalance !== null ? sctBalance : "..."} agent slots
          </p>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">USDT Balance</p>
          <p className="text-2xl font-bold text-white font-mono">
            {usdtBalance !== null ? usdtBalance.toFixed(2) : "..."}
          </p>
          <p className="text-gray-600 text-xs mt-1">on Arbitrum One</p>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {TIERS.map((tier) => {
          const pricePerToken = (tier.usdtCost / tier.sctReward).toFixed(2);
          const isPopular = tier.id === 10;
          const isBest = tier.id === 100;

          return (
            <div
              key={tier.id}
              className={`bg-dark-800 border rounded-lg p-5 relative ${
                isBest
                  ? "border-accent-green/50"
                  : isPopular
                  ? "border-accent-purple/40"
                  : "border-dark-600"
              }`}
            >
              {isBest && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent-green/20 border border-accent-green/30 text-accent-green text-xs px-2 py-0.5 rounded">
                  Best Value
                </span>
              )}
              {isPopular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent-purple/20 border border-accent-purple/30 text-purple-300 text-xs px-2 py-0.5 rounded">
                  Popular
                </span>
              )}

              <h3 className="text-lg font-bold text-white mb-1">{tier.label}</h3>
              <p className="text-3xl font-bold text-white font-mono mb-1">
                {tier.usdtCost} <span className="text-sm text-gray-400">USDT</span>
              </p>
              <p className="text-accent-green font-mono text-lg mb-1">
                {tier.sctReward} SCT
              </p>
              <p className="text-gray-600 text-xs mb-4">
                ${pricePerToken} per token
              </p>

              <button
                onClick={() => handlePurchase(tier)}
                disabled={buying}
                className={`w-full py-2.5 rounded font-medium text-sm transition-colors disabled:opacity-50 ${
                  isBest
                    ? "bg-accent-green/20 border border-accent-green/30 text-accent-green hover:bg-accent-green/30"
                    : "bg-dark-700 border border-dark-500 text-gray-300 hover:bg-dark-600"
                }`}
              >
                {buying && activeTier === tier.id ? "Processing..." : `Buy ${tier.sctReward} SCT`}
              </button>
            </div>
          );
        })}
      </div>

      {txStatus && (
        <div className="bg-dark-800 border border-accent-green/30 rounded p-3 mb-4">
          <p className="text-accent-green text-sm">{txStatus}</p>
        </div>
      )}

      {error && (
        <div className="bg-dark-800 border border-accent-red/30 rounded p-3 mb-4">
          <p className="text-accent-red text-sm">{error}</p>
        </div>
      )}

      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 text-xs text-gray-500 space-y-1">
        <p>Tokens are purchased using USDT on Arbitrum One network.</p>
        <p>MetaMask will prompt you to switch networks if needed.</p>
        <p>You need to approve USDT spending before the first purchase.</p>
      </div>
    </div>
  );
}
