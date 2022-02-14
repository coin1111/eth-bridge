// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import * as fs from 'fs';
const COIN_SCALING_FACTOR = 1000000;
const COIN_SUPPLY = 1000;

function getPrivateKey(fName:string) {
  let a = fs.readFileSync(fName,'utf8').toString().split("\n");
  return a[1].split(":")[1];
}

async function main() {
  // Deploy ERC20 token contract
  let OLToken = await ethers.getContractFactory("OLToken");

  let olToken = await OLToken.deploy((COIN_SUPPLY * COIN_SCALING_FACTOR).toString());
  await olToken.deployed();
  console.log("0LToken deployed to:", olToken.signer.getAddress());

  // let ownerKey = getPrivateKey("../accounts/alice.txt");
  // let executorKey = getPrivateKey("../accounts/bob.txt");
  // let senderKey = getPrivateKey("../accounts/pete.txt");
  // let ownerWallet = new ethers.Wallet(ownerKey);
  // let executorWallet = new ethers.Wallet(executorKey);
  // let senderWallet = new ethers.Wallet(senderKey);
  // console.log("owner: ", ownerWallet.address)

  let [owner, executorAddr, senderAddr, receiverAddr, ...addrs] = await ethers.getSigners();


  // Deploy BridgeEscrow contract
  const BridgeEscrow = await ethers.getContractFactory("BridgeEscrow");
  const escrow = await BridgeEscrow.connect(owner)
    .deploy(olToken.address, executorAddr.address);
  await escrow.deployed();

  // Transfer 100 tokens from owner to addr1
  console.log("sender: ", senderAddr.address)
  await olToken.transfer(senderAddr.address, 100);
  const addr1Balance = await olToken.balanceOf(senderAddr.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
