// Bridge agent prototype for ETH->ETH transfer
//
import { ethers } from "ethers";
import { ERC20__factory } from "../typechain/factories/ERC20__factory";
import { BridgeEscrow__factory } from "../typechain/factories/BridgeEscrow__factory";
import { getConfig, getSigners, getSigner } from "../npx-scripts/get_signers";
import { BridgeEscrow } from "../typechain/BridgeEscrow";

const ZERO_TRANFER_ID = "0x00000000000000000000000000000000";
async function main() {
  let argv = process.argv.slice(2);
  if (argv[0] == "-h" || argv[0] == "--help") {
    console.log("Usage: agent_eth.ts ");
    console.log("\t Bridge agent prototype for ETH->ETH transfer");
    return;
  }


  // get signers
  let signers = getSigners();
  // alice is agent (validator) account
  let aliceWallet = getSigner(signers, "alice");

  // get contracts
  let config = getConfig();
  let bridgeEscrowAddr = config.escrowContract;
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  const bridgeEscrow = BridgeEscrow__factory.connect(bridgeEscrowAddr, provider);

  // executor of bridge menthods
  let executor = aliceWallet.connect(provider);

  while (1) {
    // Enumerate pending transfer ids
    await processTranfers(bridgeEscrow, executor);
    await new Promise(f => setTimeout(f, 5000)); // wait 5 secs
  }
}

async function processTranfers(bridgeEscrow: BridgeEscrow, executor: ethers.Wallet) {
  let start = 0;
  let count = 10;
  let lockedLen = (await bridgeEscrow.getLockedLength()).toNumber();
  while (start < lockedLen) {
    let [transferId, startNext] = await bridgeEscrow.getNextTransferId(
      start,
      count
    );
    console.log("getNextTransferId: ", transferId);
    if (transferId != ZERO_TRANFER_ID) {
      // process transfer 
      processTransfer(transferId, bridgeEscrow, executor);
    }
    start = startNext.toNumber();
  }
  console.log("No more pending transfers");
}

async function processTransfer(transferId: string, bridgeEscrow: BridgeEscrow, executor: ethers.Signer) {
  let accountInfo = await bridgeEscrow.getLockedAccountInfo(
    transferId
  );
  if (transferId != accountInfo.transfer_id) {
    console.log("WARN: tarnsfer id mismatch,expect: {}, foudn: {}", transferId, accountInfo.transfer_id);
    return;
  }
  // withdraw
  const txWithdraw = await bridgeEscrow.connect(executor).withdrawFromEscrowThis(
    accountInfo.sender_this, // sender
    accountInfo.receiver_this, // receiver
    accountInfo.balance,
    transferId,
  );
  console.log("Withdraw: ", txWithdraw);
  // close sender account
  const txCloseSender = await bridgeEscrow.connect(executor).closeTransferAccountSender(
    transferId,
  );
  console.log("close sender: ", txCloseSender);
  // close receiver account
  const txCloseReceiver = await bridgeEscrow.connect(executor).closeTransferAccountReceiver(
    transferId,
  );
  console.log("close receiver: ", txCloseReceiver);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


