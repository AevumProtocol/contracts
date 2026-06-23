const hre = require("hardhat");

async function main() {
  const AEV_TOKEN_ADDRESS = "0x3Aecc8b53Fd0Ac659199D0D46e288dEFba908E54";
  const QUORUM = hre.ethers.parseEther("10000000");

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
