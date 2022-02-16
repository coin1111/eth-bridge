// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import * as fs from "fs";

function getConfig(): any {
  const configJson: any = fs
    .readFileSync(".bridge_escrow.config", "utf8")
    .toString()
    .trimEnd();
  return JSON.parse(configJson);
}

async function main() {
  const config = getConfig();
  const olTokenAddr = config.olTokenContract;
  const bridgeEscrowAddr = config.escrowContract;

  const [alice, bob, carol, pete, todd, bridgeEscrow, ...addrs] =
    await ethers.getSigners();

  // Bridge transfer pete to todd
  const transfer_id = "0xeab47fa3a3dc42bc8cbc48c02182669d";
  const BridgeEscrow = await ethers.getContractAt(
    "BridgeEscrow",
    bridgeEscrowAddr
  );
  const OLToken = await ethers.getContractAt("OLToken", olTokenAddr);
  const amount = 10;
  await OLToken.connect(pete).approve(BridgeEscrow.address, amount);
  const tx = await BridgeEscrow.connect(pete).createTransferAccountThis(
    todd.address,
    amount,
    transfer_id
  );
  console.log("Deposit: ", tx);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
