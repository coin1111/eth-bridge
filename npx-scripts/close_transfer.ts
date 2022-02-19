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
  if (argv.length < 1 || argv[0] == "-h" || argv[0] == "--help") {
    console.log("Usage: close_transfer.ts <transfer-id>");
    console.log("\t close transfer account ");
    console.log("\t nicknames: alice, bob, carol, pete, todd, bridgeEscrow");
    return;
  }

  const transfer_id = argv[0];

  // get signers
  let signers = getSigners();
  let aliceWallet = getSigner(signers, "alice");

  // get contracts
  let config = getConfig();
  let bridgeEscrowAddr = config.escrowContract;
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  const BridgeEscrow = BridgeEscrow__factory.connect(bridgeEscrowAddr, provider);

  // close
  let signer = aliceWallet.connect(provider);
  const tx = await BridgeEscrow.connect(signer).closeTransferAccountSender(
    transfer_id
  );
  console.log("Close: ", tx);


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


