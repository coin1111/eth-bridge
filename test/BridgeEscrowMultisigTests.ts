import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { OLToken, OLToken__factory } from "../typechain";

describe("BridgeEscrowMultisig", function () {
  let OLToken: OLToken__factory;
  let olToken: OLToken;
  let owner: SignerWithAddress;
  let executorAddr: SignerWithAddress;
  let executorAddr1: SignerWithAddress;
  let executorAddr2: SignerWithAddress;
  let senderAddr: SignerWithAddress;
  let receiverAddr: SignerWithAddress;
  let addrs;
  const COIN_SCALING_FACTOR = 1000000;
  const COIN_SUPPLY = 1000;

  beforeEach(async function () {
    // Deploy ERC20 token contract
    OLToken = await ethers.getContractFactory("OLToken");

    olToken = await OLToken.deploy((COIN_SUPPLY * COIN_SCALING_FACTOR).toString());
    await olToken.deployed();
    console.log("0LToken deployed to:", olToken.signer.getAddress());

    [owner, executorAddr, senderAddr, receiverAddr, executorAddr1, executorAddr2, ...addrs] = await ethers.getSigners();
    const ownerBalance = await olToken.balanceOf(owner.address);
    expect(await olToken.totalSupply()).to.equal(ownerBalance);


    // Transfer 100 tokens from owner to addr1
    await olToken.transfer(senderAddr.address, 100);
    const addr1Balance = await olToken.balanceOf(senderAddr.address);
    expect(addr1Balance).to.equal(100);

  });

  describe("BridgeEscrowDeposit", function () {
    it("Should be able to deposit", async function () {

      const BridgeEscrowMultisig = await ethers.getContractFactory("BridgeEscrowMultisig");
      const allowedExecutors = [executorAddr.address, executorAddr1.address, executorAddr2.address];
      const escrow = await BridgeEscrowMultisig.deploy(olToken.address, allowedExecutors, 2);
      await escrow.deployed();

      // approve transfer
      let amount = 10;
      console.log("Sender balance: ", await olToken.balanceOf(senderAddr.address), senderAddr.address);
      await olToken.connect(senderAddr).approve(escrow.address, amount);
      let allowed = await olToken.allowance(senderAddr.address, escrow.address);
      expect(allowed).to.equal(amount);

      // deposit
      const transfer_id_dep = "0xeab47fa3a3dc42bc8cbc48c02182669d";
      let senderBalanceBefore = await olToken.balanceOf(senderAddr.address);
      let contractBalanceBefore = await olToken.balanceOf(escrow.address);
      let receiver_addr = hexStringToByteArray("06505CCD81E562B524D8F656ABD92A15");
      const depositTx = await escrow.connect(senderAddr).createTransferAccount(
        receiver_addr,
        amount,
        transfer_id_dep
      );
      let senderBalanceAfter = await olToken.balanceOf(senderAddr.address);
      expect(senderBalanceBefore.toNumber() - senderBalanceAfter.toNumber()).to.equal(amount);

      let contractBalanceAfter = await olToken.balanceOf(escrow.address);
      expect(contractBalanceAfter.toNumber() - contractBalanceBefore.toNumber()).to.equal(amount);

      // account is locked
      let ai_locked = await escrow.getLockedAccountInfo(transfer_id_dep);
      expect(ai_locked.is_closed).to.equal(false);

      // delete transfer entry on sender's chain using executorAddr
      const deleteTransferAccountTx = await escrow.connect(executorAddr).closeTransferAccountSender(
        transfer_id_dep
      );
      console.log("deleteTransferAccountTx: " + deleteTransferAccountTx);


      let ai = await escrow.getLockedAccountInfo(transfer_id_dep);
      console.log("ai: " + ai);
      expect(ai.is_closed).to.equal(false);

      // delete transfer entry on sender's chain using executorAddr1
      const deleteTransferAccountTx1 = await escrow.connect(executorAddr1).closeTransferAccountSender(
        transfer_id_dep
      );
      console.log("deleteTransferAccountTx1: " + deleteTransferAccountTx1);

      ai = await escrow.getLockedAccountInfo(transfer_id_dep);
      console.log("ai: " + ai);
      expect(ai.is_closed).to.equal(true);
    });
  });

  describe("BridgeEscrowWithdraw", function () {
    it("Should be able to withdraw", async function () {

      const BridgeEscrowMultisig = await ethers.getContractFactory("BridgeEscrowMultisig");
      const allowedExecutors = [executorAddr.address, executorAddr1.address, executorAddr2.address];
      const escrow = await BridgeEscrowMultisig.deploy(olToken.address, allowedExecutors, 2);
      await escrow.deployed();

      // approve transfer
      let amount = 10;
      console.log("Sender balance: ", await olToken.balanceOf(senderAddr.address), senderAddr.address);
      await olToken.connect(senderAddr).approve(escrow.address, amount);
      let allowed = await olToken.allowance(senderAddr.address, escrow.address);
      expect(allowed).to.equal(amount);

      // fund escrow
      let contractBalanceBefore = await olToken.balanceOf(escrow.address);
      await olToken.connect(senderAddr).transfer(escrow.address, 100);

      let contractBalanceAfter = await olToken.balanceOf(escrow.address);
      expect(contractBalanceAfter.toNumber() - contractBalanceBefore.toNumber()).to.equal(100);

      // withdraw
      const transfer_id_w = "0xeab47fa3a3dc42bc8cbc48c02182669a";
      let receiverBalanceBefore = await olToken.balanceOf(receiverAddr.address);
      let sender_addr = hexStringToByteArray("06505CCD81E562B524D8F656ABD92A15");

      // call using executorAddr
      const withdrawTx = await escrow.connect(executorAddr).withdrawFromEscrow(
        sender_addr, // sender
        receiverAddr.address, // receiver
        amount,
        transfer_id_w
      );
      let ai = await escrow.getUnlockedAccountInfo(transfer_id_w);
      console.log("ai: " + ai);
      expect(ai.is_closed).to.equal(false); // transfer is pending

      let receiverBalanceAfter1 = await olToken.balanceOf(receiverAddr.address);
      expect(receiverBalanceAfter1.toNumber() - receiverBalanceBefore.toNumber()).to.equal(0);

      // call using executorAddr1
      const withdrawTx1 = await escrow.connect(executorAddr1).withdrawFromEscrow(
        sender_addr, // sender
        receiverAddr.address, // receiver
        amount,
        transfer_id_w
      );
      ai = await escrow.getUnlockedAccountInfo(transfer_id_w);
      console.log("ai: " + ai);
      expect(ai.is_closed).to.equal(true); // transfer is completed


      let receiverBalanceAfter = await olToken.balanceOf(receiverAddr.address);
      expect(receiverBalanceAfter.toNumber() - receiverBalanceBefore.toNumber()).to.equal(amount);


    });
  });
});


function hexStringToByteArray(hexString: String): Uint8Array {
  if (hexString.length % 2 !== 0) {
    throw "Must have an even number of hex digits to convert to bytes";
  }
  var numBytes = hexString.length / 2;
  var byteArray = new Uint8Array(numBytes);
  for (var i = 0; i < numBytes; i++) {
    byteArray[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  return byteArray;
}

