// Placeholder - replace after deploying the contract on Arbitrum One
export const SCT_CONTRACT_ADDRESS = "0x75386c07fe1c1bda9ed6cab1de80b62f2f5bcc76";

// USDT on Arbitrum One
export const USDT_CONTRACT_ADDRESS = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";

// Arbitrum One chain config
export const ARBITRUM_CHAIN_ID = 42161;
export const ARBITRUM_CHAIN_ID_HEX = "0xa4b1";
export const ARBITRUM_CHAIN_CONFIG = {
  chainId: "0xa4b1",
  chainName: "Arbitrum One",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://arb1.arbitrum.io/rpc"],
  blockExplorerUrls: ["https://arbiscan.io"],
};

// SCT contract ABI - only functions we interact with from frontend
export const SCT_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function wholeTokenBalance(address account) view returns (uint256)",
  "function purchaseTokens(uint256 tier) external",
];

// USDT ABI - for approval
export const USDT_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

// Tier definitions
export const TIERS = [
  { id: 1, usdtCost: 1, sctReward: 1, label: "Starter" },
  { id: 10, usdtCost: 10, sctReward: 20, label: "Pro" },
  { id: 100, usdtCost: 100, sctReward: 250, label: "Whale" },
];
