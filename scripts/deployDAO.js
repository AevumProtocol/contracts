const hre = require("hardhat");

async function main() {
  const AEV_TOKEN_ADDRESS = "0x1C47FE8AE5531008Ec57fC60C7498Ebf2c2Ac920";
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
