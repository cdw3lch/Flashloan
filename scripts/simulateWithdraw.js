require("dotenv").config();

// ── CONFIG (must be top‐level) ───────────────────────
const ALCHEMY_BASE     = process.env.ALCHEMY_BASE;   // e.g. https://base-mainnet.g.alchemy.com/v2/KEY
const PRIVATE_KEY      = process.env.PRIVATE_KEY;   // your wallet key
const CONTRACT_ADDRESS = "0xdf095422e096f7D1Dd9b05a027DDaDb29b944E30";
const EURC_ADDRESS     = "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42";
const WELL_ADDRESS     = "0xA88594D404727625A9437C3f886C7643872296AE";
const ABI              = require("../artifacts/contracts/LeveragedYieldFarm.sol/LeveragedYieldFarm.json").abi;
// ───────────────────────────────────────────────────────

const ethers = require("ethers");  // now pulls v5

async function main() {
  // 1) provider & signer
  const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_BASE);
  const signer   = new ethers.Wallet(PRIVATE_KEY, provider);

  // 2) attach contracts
  const farm = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  const eurc = new ethers.Contract(EURC_ADDRESS, ["function balanceOf(address) view returns (uint256)"], signer);
  const well = new ethers.Contract(WELL_ADDRESS, ["function balanceOf(address) view returns (uint256)"], signer);

  // 3) pre‐withdraw balances
  const eurcBefore = await eurc.balanceOf(CONTRACT_ADDRESS);
  const wellBefore = await well.balanceOf(CONTRACT_ADDRESS);
  console.log("Pre‐withdraw EURC:", ethers.utils.formatUnits(eurcBefore, 6));
  console.log("Pre‐withdraw WELL:", ethers.utils.formatUnits(wellBefore, 18));

  // 4) simulate withdraw(503)
  const amount = ethers.utils.parseUnits("503", 6);
  try {
    await farm.callStatic.withdraw(amount);
    console.log("✅ callStatic.withdraw succeeded");
  } catch (err) {
    console.error("❌ callStatic.withdraw reverted:", err.message);
    return;
  }

  // 5) post‐withdraw balances
  const eurcAfter = await eurc.balanceOf(CONTRACT_ADDRESS);
  const wellAfter = await well.balanceOf(CONTRACT_ADDRESS);
  console.log("Estimated EURC gained:", ethers.utils.formatUnits(eurcAfter.sub(eurcBefore), 6));
  console.log("Estimated WELL earned:", ethers.utils.formatUnits(wellAfter.sub(wellBefore), 18));
}

main().catch(console.error);
