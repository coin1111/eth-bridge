// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import * as fs from 'fs';
const COIN_SCALING_FACTOR = 1000000;
const COIN_SUPPLY = 1000;

async function main() {

  let minVotes = 1;
  const minVotesEnv: string | undefined = process.env.ETH_BRIDGE_ESCROW_MIN_VOTES;
  minVotes = Number(minVotesEnv);
  if (minVotes == 0) {
    minVotes = 1;
  }

  console.log("Deploying contract with minVotes: ",minVotes);

  // Deploy ERC20 token contract
  let OLToken = await ethers.getContractFactory("OLToken");

  let olToken = await OLToken.deploy((COIN_SUPPLY * COIN_SCALING_FACTOR).toString());
  await olToken.deployed();
  console.log("0LToken contract:", olToken.address);

//  let [alice, bob, carol, pete, todd, bridgeEscrow, ...addrs] = await ethers.getSigners();
  let aliceAddress = "0x37d1D0AF3Cb314051FaeaFB9D0501d7e67503634";
  let bobAddress = "0xBd11eDD68a7A1117C3eC93eA4dD5543F9Cb409CB";
  let carolAddress = "0x39312F00Afb9c7245FE70c381a7DCf125E8173Ca";
  let peteAddress = "0xaB2130f3f717562BFf52a1Ff78AC66404784C14d";
  let toddAddress = "0x62a7CB8cC3aB47C410c051aB93C749488b9399e4";
  let bridgeEscrowAddress = "0x15ef6A06cF6BF0e9668aAa357d63e17100c7060C";

  console.log("Alice address: ", aliceAddress);
  console.log("Bob address: ", bobAddress);
  console.log("Carol address: ", carolAddress);
  console.log("pete address: ", peteAddress);
  console.log("todd address: ", toddAddress);


  // Deploy BridgeEscrow contract
  const BridgeEscrow = await ethers.getContractFactory("BridgeEscrowMultisig");
  const escrow = await BridgeEscrow.connect(bridgeEscrowAddress)
    .deploy(olToken.address, [aliceAddress, bobAddress], minVotes);
  await escrow.deployed();
  console.log("BridgeEscrow contract:", escrow.address);

  // Transfer 100 tokens from owner to pete
  await olToken.transfer(peteAddress, 100);

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
