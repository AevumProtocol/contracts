const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const VBO_ADDRESS = "0x9dBC2f11E11C64810922B4c68d55DFf1BCA4Dc8d";
  const strategyHash = "0x0342a2b633a4229878f4442eeba81ee3c942515876a8e03ca3ebd7b1826b9541";

  const [deployer] = await ethers.getSigners();
  console.log("Committing from:", deployer.address);
  console.log("Strategy hash:", strategyHash);

  const VBO = await ethers.getContractAt("VerifiableBacktestOracle", VBO_ADDRESS);

  const FORWARD_WINDOW_DAYS = 7;
  const BOND = ethers.parseEther("0.001");

  const tx = await VBO.commitStrategy(strategyHash, FORWARD_WINDOW_DAYS, { value: BOND });
  console.log("Commit tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("Confirmed at block:", receipt.blockNumber);

  const windowEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  console.log("Forward window closes:", windowEnd.toISOString());
  console.log("Commitment ID: 2");
}

main().catch(console.error);
