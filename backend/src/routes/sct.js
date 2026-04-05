import { Router } from "express";
import { ethers } from "ethers";
import { SCT_CONTRACT_ADDRESS, SCT_ABI, RPC_URL } from "../config/contract.js";

const router = Router();

function getSCTContract() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(SCT_CONTRACT_ADDRESS, SCT_ABI, provider);
}

// GET /api/sct/balance/:walletAddress - get SCT token balance (whole tokens)
router.get("/balance/:walletAddress", async (req, res) => {
  const { walletAddress } = req.params;

  if (!ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  try {
    const contract = getSCTContract();
    const wholeBalance = await contract.wholeTokenBalance(walletAddress);
    res.json({ balance: Number(wholeBalance) });
  } catch (err) {
    console.error("Failed to read SCT balance:", err.message);
    // If contract isn't deployed yet, return 0
    res.json({ balance: 0 });
  }
});

export default router;
