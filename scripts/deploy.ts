// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import * as fs from 'fs';
const COIN_SCALING_FACTOR = 1000000;
const COIN_SUPPLY = 1000;

async function main() {
  // Deploy ERC20 token contract
  let OLToken = await ethers.getContractFactory("OLToken");

  let olToken = await OLToken.deploy((COIN_SUPPLY * COIN_SCALING_FACTOR).toString());
  await olToken.deployed();
  console.log("0LToken contract:", olToken.address);

  let [alice, bob, carol, pete, todd, bridgeEscrow, ...addrs] = await ethers.getSigners();
  console.log("Alice address: ", alice.address);
  console.log("Bob address: ", bob.address);
  console.log("Carol address: ", carol.address);
  console.log("pete address: ", pete.address);
  console.log("todd address: ", todd.address);


  // Deploy BridgeEscrow contract
  const BridgeEscrow = await ethers.getContractFactory("BridgeEscrowMultisig");
  const escrow = await BridgeEscrow.connect(bridgeEscrow)
    .deploy(olToken.address, [alice.address, bob.address], 1);
  await escrow.deployed();
  console.log("BridgeEscrow contract:", escrow.address);

  // Transfer 100 tokens from owner to pete
  await olToken.transfer(pete.address, 100);

  // Transfer 1000000 tokens from owner to escrow account
  await olToken.transfer(escrow.address, 1000000);

  // save addresses to config
  let config: any = {
    olTokenContract: olToken.address,
    escrowContract: escrow.address,
    url: "http://localhost:8545",
    gasPrice: 832411510,
  }
  fs.writeFile(".bridge_escrow.config", JSON.stringify(config), function (err) {
    if (err) {
      console.log(err);
    }
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
