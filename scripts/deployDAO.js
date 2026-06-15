const hre = require("hardhat");

async function main() {
  const AEV_TOKEN_ADDRESS = "0x7Bb412e4DEe3C89Ae50c143dc352eE801d429131";
  const QUORUM = hre.ethers.parseEther("1000000"); // 1M AEV to pass a proposal

  const AevumDAO = await hre.ethers.getContractFactory("AevumDAO");
  const dao = await AevumDAO.deploy(AEV_TOKEN_ADDRESS, QUORUM);
  await dao.waitForDeployment();
  const address = await dao.getAddress();
  console.log("AevumDAO deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
