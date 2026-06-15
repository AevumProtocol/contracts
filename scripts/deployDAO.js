const hre = require("hardhat");

async function main() {
  const AEV_TOKEN_ADDRESS = "0x8EB57eeDa655d46A01d54F4359E392c9be1F7F2C";
  const QUORUM = hre.ethers.parseEther("1000000");

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
