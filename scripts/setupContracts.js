const hre = require("hardhat");
const { ethers } = hre;

const NEW_ORACLE = "0xa1d354A6f0960d394da6E5f68Bdb8BE4cfE543A7";
const NEW_CONTROLLER = "0x81821ed809CDf44f487bb66f9d531658404D57aB";
const AGENT_IDENTITY = "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B";
const AGENT_VAULT = "0x86D741407E2Df0400AbE2BB8E8E5075BA10E409d";
const AGENT_MARKETPLACE = "0xff7A5eBb3ab2C1E92A58B7b6F25CCB6588785Af9";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up from:", deployer.address);

  const identity = await ethers.getContractAt("AgentIdentity", AGENT_IDENTITY);
  const oracle = await ethers.getContractAt("ReputationOracle", NEW_ORACLE);

  // 1. Set new ReputationController on AgentIdentity
  let tx = await identity.setReputationController(NEW_CONTROLLER);
  await tx.wait();
  console.log("✓ ReputationController set on AgentIdentity");

  // 2. Register AgentVault with new oracle
  tx = await oracle.registerProtocol(AGENT_VAULT, 100);
  await tx.wait();
  console.log("✓ AgentVault registered with oracle (min score: 100)");

  // 3. Register AgentMarketplace with new oracle
  tx = await oracle.registerProtocol(AGENT_MARKETPLACE, 200);
  await tx.wait();
  console.log("✓ AgentMarketplace registered with oracle (min score: 200)");

  console.log("\n✅ All contracts wired up");
}

main().catch(console.error);
