const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY = "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B";
  const WALLET = "0xb57dC33a8E2B54ed025C28ef2080648f35875a2E";

  const AgentIdentity = await hre.ethers.getContractFactory("AgentIdentity");
  const contract = AgentIdentity.attach(AGENT_IDENTITY);

  const agentId = await contract.getAgentByAddress(WALLET);
  console.log("Agent ID:", agentId.toString());

  if (agentId.toString() !== "0") {
    const agent = await contract.getAgent(agentId);
    console.log("Owner:", agent.owner);
    console.log("Reputation:", agent.reputationScore.toString());
    console.log("Active:", agent.isActive);
    console.log("Strategy Hash:", agent.strategyHash);
  } else {
    console.log("No agent registered for this wallet");
  }
}

main().catch(console.error);
