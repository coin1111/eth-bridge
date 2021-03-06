// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "ethers";
import { ERC20__factory } from "../typechain/factories/ERC20__factory";
import { BridgeEscrow__factory } from "../typechain/factories/BridgeEscrow__factory";
import { getConfig, getSigners, getSigner } from "./get_signers";


async function main() {
  let argv = process.argv.slice(2);
  if (argv.length < 4 || argv[0] == "-h" || argv[0] == "--help") {
    console.log("Usage: withdraw.ts  <sender> <receiver> <amount> <transfer-id>");
    console.log("\t withdraw funds from escrow into receiver for amount");
    console.log("\t sender - nick or address of depositor");
    console.log("\t receiver - nick or address of receiver");
    console.log("\t nicknames: alice, bob, carol, pete, todd, bridgeEscrow");
    return;
  }

  let sender = argv[0];
  let receiver = argv[1];
  let amount = argv[2];
  const transfer_id = argv[3];

  // get signers
  let signers = getSigners();
  let receiverWallet = getSigner(signers, receiver);
  let aliceWallet = getSigner(signers, "alice");
  if (!sender.startsWith("0x")) {
    throw Error("ERROR: sender address must start with 0x");
  }

  sender = sender.substring(2);
  let sender_addr = hexStringToByteArray(sender);
  console.log("sender address:",sender);


  // get contracts
  let config = getConfig();
  let bridgeEscrowAddr = config.escrowContract;
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  const BridgeEscrow = BridgeEscrow__factory.connect(bridgeEscrowAddr, provider);

  // Withdraw
  let signer = aliceWallet.connect(provider);
  const tx = await BridgeEscrow.connect(signer).withdrawFromEscrow(
    sender_addr, // sender
    receiverWallet.address, // receiver
    amount,
    transfer_id,

  );
  console.log("Withdraw: ", tx);

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


