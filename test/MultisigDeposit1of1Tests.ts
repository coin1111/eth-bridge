// Deposit tests for bridge multisig contract
// use 1 out of 1 possible signers

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { OLToken, OLToken__factory } from "../typechain";

describe("BridgeEscrowMultisig", function () {
  let OLToken: OLToken__factory;
  let olToken: OLToken;
  let owner: SignerWithAddress;
  let executorAddr: SignerWithAddress;
  let senderAddr: SignerWithAddress;
  let addrs;
  const COIN_SCALING_FACTOR = 1000000;
  const COIN_SUPPLY = 1000;

  beforeEach(async function () {
    // Deploy ERC20 token contract
    OLToken = await ethers.getContractFactory("OLToken");

    olToken = await OLToken.deploy((COIN_SUPPLY * COIN_SCALING_FACTOR).toString());
    await olToken.deployed();
    console.log("0LToken deployed to:", olToken.signer.getAddress());

    [owner, executorAddr, senderAddr, ...addrs] = await ethers.getSigners();
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
      const allowedExecutors = [executorAddr.address];
      const escrow = await BridgeEscrowMultisig.deploy(olToken.address, allowedExecutors, 1);
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
      await escrow.connect(senderAddr).createTransferAccount(
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
      expect(ai.is_closed).to.equal(true);
      expect(ai.currentVotes).to.equal(1);

      // delete transfer entry on sender's chain using executorAddr, revert
      await expect(escrow.connect(executorAddr).closeTransferAccountSender(
        transfer_id_dep
      )).to.be.revertedWith("transfer is completed already");

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

