// Bridge agent prototype for ETH->ETH transfer
//
import { ethers } from "ethers";
import { ERC20__factory } from "../typechain/factories/ERC20__factory";
import { BridgeEscrow__factory } from "../typechain/factories/BridgeEscrow__factory";
import { getConfig, getSigners, getSigner } from "../npx-scripts/get_signers";
import { BridgeEscrow } from "../typechain/BridgeEscrow";

const ZERO_TRANSFER_ID = "0x00000000000000000000000000000000";
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
    await new Promise(f => setTimeout(f, 20000)); // wait 5 secs
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
    if (transferId != ZERO_TRANSFER_ID) {
      // process transfer 
      await processTransfer(transferId, bridgeEscrow, executor);
    }
    start = startNext.toNumber();
  }
  console.log("No more pending transfers");
}

async function processTransfer(transferId: string, bridgeEscrow: BridgeEscrow, executor: ethers.Signer) {
  // Process transfer as follows
  // 1. Check transfer_id entry in unlocked. If this entry exists that means that withdrawal
  // has been made already. At this point we can close locked entry and remove transfer_id
  // from pending transfers in locked_idx
  // 2. If unlocked has no entry for given transfer_id, that means that withdrawal didn't happen. Thus we need
  // to withdraw funds into user account and then repeat step 1. above

  if (transferId == ZERO_TRANSFER_ID) {
    throw new Error("Invalid transferId:" + transferId);
  }

  let accountInfoUnlocked = await bridgeEscrow.getUnlockedAccountInfo(
    transferId
  );

  if (accountInfoUnlocked.transfer_id == transferId) {
    console.log("Found unlocked account, close it: ", accountInfoUnlocked.transfer_id);
    // close sender account
    // this will erase entry from pending transfers and close locked entry
    const txCloseSender = await bridgeEscrow.connect(executor).closeTransferAccountSender(
      transferId,
    );
    console.log("close sender: ", txCloseSender);
    return;
  }

  // withdrawal has not been made yet, do it now
  // get information about deposit
  let accountInfo = await bridgeEscrow.getLockedAccountInfo(
    transferId
  );
  if (transferId != accountInfo.transfer_id) {
    // sanity check
    console.log("WARN: transfer id mismatch,expect: {}, found: {}", transferId, accountInfo.transfer_id);
    return;
  } else if (accountInfo.is_closed) {
      // sanity check, account must not be closed
      console.log("WARN: transfer id is closed, cannot withdraw: {}", transferId,);
      return;
  } else {
    // withdraw
    const txWithdraw = await bridgeEscrow.connect(executor).withdrawFromEscrowThis(
      accountInfo.sender_this, // sender
      accountInfo.receiver_this, // receiver
      accountInfo.balance,
      transferId,
    );
    console.log("Withdraw: ", txWithdraw);

    // ensure that withdrawal happened
    let accountInfoUnlocked = await bridgeEscrow.getUnlockedAccountInfo(
      transferId
    );

    if (accountInfoUnlocked.transfer_id == transferId) {
      // close sender account
      // this will erase entry from pending transfers and erase locked entry
      const txCloseSender = await bridgeEscrow.connect(executor).closeTransferAccountSender(
        transferId,
      );
      console.log("close sender: ", txCloseSender);
      return;
    } else {
      console.log("WARN: failed to withdraw for transferId. Will retry later", transferId);
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


