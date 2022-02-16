import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { OLToken, OLToken__factory } from "../typechain";

describe("BridgeEscrow", function () {
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
    // Get the ContractFactory and Signers here.
    OLToken = await ethers.getContractFactory("OLToken");
    [owner, executorAddr, senderAddr, receiverAddr, ...addrs] =
      await ethers.getSigners();

    olToken = await OLToken.deploy(
      (COIN_SUPPLY * COIN_SCALING_FACTOR).toString()
    );
    await olToken.deployed();
    console.log("0LToken deployed to:", olToken.signer.getAddress());

    const ownerBalance = await olToken.balanceOf(owner.address);
    expect(await olToken.totalSupply()).to.equal(ownerBalance);

    // Transfer 100 tokens from owner to addr1
    await olToken.transfer(senderAddr.address, 100);
    const addr1Balance = await olToken.balanceOf(senderAddr.address);
    expect(addr1Balance).to.equal(100);
  });

  describe("BridgeEscrowDepositWithdraw", function () {
    it("Should transfer between senderAddr and receiverAddr", async function () {
      const BridgeEscrow = await ethers.getContractFactory("BridgeEscrow");
      const escrow = await BridgeEscrow.deploy(
        olToken.address,
        executorAddr.address
      );
      await escrow.deployed();

      // approve transfer
      const amount = 10;
      console.log(
        "Sender balance: ",
        await olToken.balanceOf(senderAddr.address),
        senderAddr.address
      );
      await olToken.connect(senderAddr).approve(escrow.address, amount);
      const allowed = await olToken.allowance(
        senderAddr.address,
        escrow.address
      );
      expect(allowed).to.equal(amount);

      // deposit
      const transfer_id =
        "0xeab47fa3a3dc42bc8cbc48c02182669deab47fa3a3dc42bc8cbc48c02182669d";
      const senderBalanceBefore = await olToken.balanceOf(senderAddr.address);
      const contractBalanceBefore = await olToken.balanceOf(escrow.address);
      const depositTx = await escrow
        .connect(senderAddr)
        .createTransferAccountThis(receiverAddr.address, amount, transfer_id);
      const senderBalanceAfter = await olToken.balanceOf(senderAddr.address);
      expect(
        senderBalanceBefore.toNumber() - senderBalanceAfter.toNumber()
      ).to.equal(amount);

      const contractBalanceAfter = await olToken.balanceOf(escrow.address);
      expect(
        contractBalanceAfter.toNumber() - contractBalanceBefore.toNumber()
      ).to.equal(amount);

      // withdraw
      const receiverBalanceBefore = await olToken.balanceOf(
        receiverAddr.address
      );
      const withdrawTx = await escrow
        .connect(executorAddr)
        .withdrawFromEscrowThis(
          senderAddr.address, // sender
          receiverAddr.address, // receiver
          amount,
          transfer_id
        );
      const receiverBalanceAfter = await olToken.balanceOf(
        receiverAddr.address
      );
      expect(
        receiverBalanceAfter.toNumber() - receiverBalanceBefore.toNumber()
      ).to.equal(amount);

      // delete transfer entry on sender's chain
      const deleteTransferAccountTx = await escrow
        .connect(executorAddr)
        .closeTransferAccountSender(transfer_id);

      // delete transfer entry on receiver's chain
      const deleteUnlockedTx = await escrow
        .connect(executorAddr)
        .closeTransferAccountReceiver(transfer_id);
    });
  });
});
