const hre = require("hardhat");
const { ethers } = hre;

const NEW_OWNER = "0x7Ba97591b0D50D093c41aE2898f44b32d0A97769";

const CONTRACTS = {
  AgentIdentity: "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B",
  ReputationOracle: "0xAda16c3ca238BE164E716F280D3D184269e4A0A9",
  AgentMarketplace: "0xff7A5eBb3ab2C1E92A58B7b6F25CCB6588785Af9",
  AEVToken: "0x1C47FE8AE5531008Ec57fC60C7498Ebf2c2Ac920",
  ReputationController: "0x09D6D8Bb81140E8395Af7b6bc954b0Ab053dd121",
  TokenVesting: "0x482C01015E7a845BBd923d18eF627D90448b9d2c",
  AevumDAO: "0x11205fdFC73Bc7527C2fDc68E7369fcC1f6144dD",
};

const ABI = ["function transferOwnership(address newOwner) external"];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Transferring from:", deployer.address);
  console.log("New owner:", NEW_OWNER);
  console.log("");

  for (const [name, addr] of Object.entries(CONTRACTS)) {
    try {
      const contract = await ethers.getContractAt(ABI, addr);
      const tx = await contract.transferOwnership(NEW_OWNER);
      await tx.wait();
      console.log(`✓ ${name} — tx: ${tx.hash}`);
    } catch (e) {
      console.log(`✗ ${name} — ${e.reason || e.message}`);
    }
  }

  console.log("\nDone. Verify with:");
  console.log("npx hardhat run scripts/checkOwners.js --network sepolia");
}

main().catch(console.error);
