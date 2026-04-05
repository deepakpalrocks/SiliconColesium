// Placeholder addresses - replace SCT_CONTRACT_ADDRESS after deploying
export const SCT_CONTRACT_ADDRESS =
  process.env.SCT_CONTRACT_ADDRESS || "0x75386c07fe1c1bda9ed6cab1de80b62f2f5bcc76";

// USDT on Arbitrum One
export const USDT_CONTRACT_ADDRESS =
  process.env.USDT_CONTRACT_ADDRESS || "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";

// Arbitrum One RPC
export const RPC_URL =
  process.env.RPC_URL || "https://arb1.arbitrum.io/rpc";

// Minimal ABI - only the functions we need to read
export const SCT_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function wholeTokenBalance(address account) view returns (uint256)",
];
