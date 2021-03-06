// Withdraw tests for bridge multisig contract
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

    [owner, executorAddr, senderAddr, receiverAddr, ...addrs] = await ethers.getSigners();
    const ownerBalance = await olToken.balanceOf(owner.address);
    expect(await olToken.totalSupply()).to.equal(ownerBalance);


    // Transfer 100 tokens from owner to addr1
    await olToken.transfer(senderAddr.address, 100);
    const addr1Balance = await olToken.balanceOf(senderAddr.address);
    expect(addr1Balance).to.equal(100);

  });


  describe("BridgeEscrowWithdraw", function () {
    it("Should be able to withdraw", async function () {

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
      await escrow.connect(executorAddr).withdrawFromEscrow(
        sender_addr, // sender
        receiverAddr.address, // receiver
        amount,
        transfer_id_w
      );
      let ai = await escrow.getUnlockedAccountInfo(transfer_id_w);
      console.log("ai: " + ai);
      expect(ai.is_closed).to.equal(true); // transfer is pending

      // call withdraw again using executorAddr, revert
      await expect(escrow.connect(executorAddr).withdrawFromEscrow(
        sender_addr, // sender
        receiverAddr.address, // receiver
        amount,
        transfer_id_w
      )).to.be.revertedWith("transfer has been completed already");

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

