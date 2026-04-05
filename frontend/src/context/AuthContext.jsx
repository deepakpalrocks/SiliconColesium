import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { checkWallet, signup as apiSignup, getSCTBalance } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [user, setUser] = useState(null); // { id, username, wallet_address }
  const [connecting, setConnecting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);

  // On mount, check if MetaMask is already connected
  useEffect(() => {
    async function checkExisting() {
      if (!window.ethereum) return;
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          const addr = accounts[0];
          setWalletAddress(addr);
          const result = await checkWallet(addr);
          if (result.registered) {
            setUser(result.user);
          }
        }
      } catch {
        // silently fail
      }
    }
    checkExisting();

    // Listen for account changes
    if (window.ethereum) {
      const handler = (accounts) => {
        if (accounts.length === 0) {
          setWalletAddress(null);
          setUser(null);
        } else {
          const addr = accounts[0];
          setWalletAddress(addr);
          // Re-check registration for new account
          checkWallet(addr).then((result) => {
            setUser(result.registered ? result.user : null);
          }).catch(() => setUser(null));
        }
      };
      window.ethereum.on("accountsChanged", handler);
      return () => window.ethereum.removeListener("accountsChanged", handler);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const addr = accounts[0];
      setWalletAddress(addr);

      // Check if this wallet is already registered
      const result = await checkWallet(addr);
      if (result.registered) {
        setUser(result.user);
      }
      return { address: addr, registered: result.registered, user: result.user };
    } finally {
      setConnecting(false);
    }
  }, []);

  const signUp = useCallback(
    async (username) => {
      if (!window.ethereum || !walletAddress) {
        throw new Error("Wallet not connected");
      }

      const message = `I confirm to sign in the wallet ${walletAddress} with my name ${username} on the Silicon Colesium app`;

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const result = await apiSignup({
        username,
        wallet_address: walletAddress,
        signature,
        message,
      });

      setUser(result.user);
      return result.user;
    },
    [walletAddress]
  );

  const refreshTokenBalance = useCallback(async (addr) => {
    const wallet = addr || walletAddress;
    if (!wallet) return;
    try {
      const { balance } = await getSCTBalance(wallet);
      setTokenBalance(balance);
    } catch {
      setTokenBalance(0);
    }
  }, [walletAddress]);

  // Load token balance when user is set
  useEffect(() => {
    if (user?.wallet_address) {
      refreshTokenBalance(user.wallet_address);
      const interval = setInterval(() => refreshTokenBalance(user.wallet_address), 30000);
      return () => clearInterval(interval);
    }
  }, [user, refreshTokenBalance]);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    setUser(null);
    setTokenBalance(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        walletAddress,
        user,
        connecting,
        tokenBalance,
        isConnected: !!walletAddress,
        isRegistered: !!user,
        connectWallet,
        signUp,
        disconnect,
        refreshTokenBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
