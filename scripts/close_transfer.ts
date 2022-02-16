// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import * as fs from 'fs';

function getConfig():any {
  let configJson:any = fs.readFileSync(".bridge_escrow.config",'utf8').toString().trimEnd();
  return JSON.parse(configJson);
}

async function main() {;

  let config = getConfig();
  let olTokenAddr = config.olTokenContract;
  let bridgeEscrowAddr = config.escrowContract;


  let [alice, bob, carol, pete, todd, bridgeEscrow, ...addrs] = await ethers.getSigners();

  const transfer_id = "0xeab47fa3a3dc42bc8cbc48c02182669d";
  const BridgeEscrow = await ethers.getContractAt("BridgeEscrow",bridgeEscrowAddr);
  const OLToken = await ethers.getContractAt("OLToken",olTokenAddr);


  const deleteTransferAccountTx = await BridgeEscrow.connect(alice).closeTransferAccountSender(
    transfer_id
  );

  console.log("closeTransferAccountSender: ",deleteTransferAccountTx);


  // close this chain transfer account
  const deleteUnlockedTx = await BridgeEscrow.connect(alice).closeTransferAccountReceiver(
    transfer_id
  );

  console.log("deleteUnlockedTx: ",deleteUnlockedTx);
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
