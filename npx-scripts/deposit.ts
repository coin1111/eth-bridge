// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "ethers";
import { ERC20__factory } from "../typechain/factories/ERC20__factory";
import { BridgeEscrow__factory } from "../typechain/factories/BridgeEscrow__factory";
import { getConfig, getSigners, getSigner } from "./get_signers";
import {v4 as uuidv4} from "uuid";


async function main() {
  let argv = process.argv.slice(2);
  if (argv.length < 3 || argv[0] == "-h" || argv[0] == "--help") {
    console.log("Usage: deposit.ts <sender> <receiver> <amount> [<transfer-id>]");
    console.log("\t deposit amount into escrow contract");
    console.log("\t sender - nick or address of depositor");
    console.log("\t receiver - address of receiver");
    console.log("\t nicknames: alice, bob, carol, pete, todd, bridgeEscrow");
    return;
  }

  let sender = argv[0];
  let receiver = argv[1];
  let amount = argv[2];
  let transfer_id = argv[3];
  if (transfer_id == undefined){
    transfer_id = "0x"+uuidv4().replace(/\-/g,"");
  }

  console.log("Use transfer_id: ",transfer_id);

  // get signers
  let signers = getSigners();
  let senderWallet = getSigner(signers, sender);

    // get contracts
    let config = getConfig();
    let olTokenAddr = config.olTokenContract;
    let bridgeEscrowAddr = config.escrowContract;
    const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
    let olToken = ERC20__factory.connect(olTokenAddr, provider);
    const BridgeEscrow = BridgeEscrow__factory.connect(bridgeEscrowAddr, provider);

  if (!receiver.startsWith("0x")) {
    throw Error("receiver must start with 0x")
  }

  receiver = receiver.substring(2);
  let receiver_addr = hexStringToByteArray(receiver);
  console.log("Receiver address:",receiver)
  //  Deposit
  let signer = senderWallet.connect(provider);
  await olToken.connect(signer).approve(BridgeEscrow.address, amount);
  const tx = await BridgeEscrow.connect(signer).createTransferAccount(
    receiver_addr,
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

function hexStringToByteArray(hexString:String):Uint8Array {
  if (hexString.length % 2 !== 0) {
      throw "Must have an even number of hex digits to convert to bytes";
  }
  var numBytes = hexString.length / 2;
  var byteArray = new Uint8Array(numBytes);
  for (var i=0; i<numBytes; i++) {
      byteArray[i] = parseInt(hexString.substr(i*2, 2), 16);
  }
  return byteArray;
}


