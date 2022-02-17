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
  if (argv.length < 3 || argv[0] == "-h" || argv[0] == "--help") {
    console.log("Usage: deposit.ts sender receiver amount");
    console.log("\t deposit amount into escrow contract");
    console.log("\t sender - nick or address of depositor");
    console.log("\t sreceiverender - nick or address of receiver");
    console.log("\t nicknames: alice, bob, carol, pete, todd, bridgeEscrow");
    return;
  }

  let sender = argv[0];
  let receiver = argv[1];
  let amount = argv[2];

  // get signers
  let signers = getSigners();
  let senderWallet = getSigner(signers, sender);
  let receiverWallet = getSigner(signers, receiver);

  // get contracts
  let config = getConfig();
  let olTokenAddr = config.olTokenContract;
  let bridgeEscrowAddr = config.escrowContract;
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  let olToken = ERC20__factory.connect(olTokenAddr, provider);
  const BridgeEscrow = BridgeEscrow__factory.connect(bridgeEscrowAddr, provider);

  // // Deposit
  const transfer_id = "0xeab47fa3a3dc42bc8cbc48c02182669d";

  let signer = senderWallet.connect(provider);
  await olToken.connect(signer).approve(BridgeEscrow.address, amount);
  const tx = await BridgeEscrow.connect(signer).createTransferAccountThis(
    receiverWallet.address,
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


