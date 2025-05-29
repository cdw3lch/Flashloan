// scripts/checkPosition.js
require("dotenv").config();
const ethers = require("ethers");

// ── CONFIG ──────────────────────────────────────────────
const ALCHEMY_BASE   = process.env.ALCHEMY_BASE;
const PRIVATE_KEY    = process.env.PRIVATE_KEY;
const FARM_ADDRESS   = "0xdf095422e096f7D1Dd9b05a027DDaDb29b944E30";
const EURC_ADDRESS   = "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42";
const M_EURC_ADDRESS = "0xb682c840B5F4FC58B20769E691A6fa1305A501a2";
const REWARD_ADDRESS = "0xe9005b078701e2A0948D2EaC43010D35870Ad9d2";
// ────────────────────────────────────────────────────────

const mEURC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function borrowBalanceCurrent(address) returns (uint256)",
  "function exchangeRateStored() view returns (uint256)"
];
const REWARD_ABI = [
  "function getOutstandingRewardsForUser(address token,address user) view returns (tuple(address emissionToken,uint256 totalAmount,uint256 supplySide,uint256 borrowSide)[])"
];

async function main() {
  // 1) Setup provider & signer
  const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_BASE);
  const signer   = new ethers.Wallet(PRIVATE_KEY, provider);

  // 2) Attach to the mEURC and reward contracts
  const mEURC   = new ethers.Contract(M_EURC_ADDRESS, mEURC_ABI, provider);
  const rewards = new ethers.Contract(REWARD_ADDRESS, REWARD_ABI, provider);

  // 3) Read on-chain values
  const [mBal, rate] = await Promise.all([
    mEURC.balanceOf(FARM_ADDRESS),
    mEURC.exchangeRateStored()
  ]);
  // Use callStatic to simulate the borrowBalanceCurrent() view
  const borrowed = await mEURC.callStatic.borrowBalanceCurrent(FARM_ADDRESS);

  // 4) Calculate supplied & net
  // Correct the divisor to 1e18 for Compound-style mToken
  const suppliedRaw = mBal.mul(rate).div(ethers.BigNumber.from(10).pow(18));
  const netRaw      = suppliedRaw.sub(borrowed);

  console.log("🔹 mEURC balance:", ethers.utils.formatUnits(mBal, 8));
  console.log("🔹 Exchange rate:", ethers.utils.formatUnits(rate, 18));
  console.log("➡️ Supplied EURC:", ethers.utils.formatUnits(suppliedRaw, 6));
  console.log("➡️ Borrowed EURC:", ethers.utils.formatUnits(borrowed, 6));
  console.log("✅ Net EURC on withdraw:", ethers.utils.formatUnits(netRaw, 6));

  // 5) Fetch WELL rewards
  const infos = await rewards.getOutstandingRewardsForUser(M_EURC_ADDRESS, FARM_ADDRESS);
  for (const { emissionToken, totalAmount, supplySide, borrowSide } of infos) {
    console.log("\n💎 Reward Token:", emissionToken);
    console.log("  • Total:", ethers.utils.formatUnits(totalAmount, 18));
    console.log("  • Supply-side:", ethers.utils.formatUnits(supplySide, 18));
    console.log("  • Borrow-side:", ethers.utils.formatUnits(borrowSide, 18));
  }
}

main().catch(console.error);
