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
    [owner, executorAddr, senderAddr, receiverAddr, ...addrs] = await ethers.getSigners();

    olToken = await OLToken.deploy((COIN_SUPPLY * COIN_SCALING_FACTOR).toString());
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
    it("Should return the new greeting once it's changed", async function () {

      const BridgeEscrow = await ethers.getContractFactory("BridgeEscrow");
      const escrow = await BridgeEscrow.deploy(olToken.address);
      await escrow.deployed();

      // approve transfer
      console.log("Sender balance: ", await olToken.balanceOf(senderAddr.address), senderAddr.address);
      await olToken.connect(senderAddr).approve(escrow.address, 10);
      let allowed = await olToken.allowance(senderAddr.address, escrow.address);
      expect(allowed).to.equal(10);

      // deposit
      const transfer_id = "0xeab47fa3a3dc42bc8cbc48c02182669d";
      const depositTx = await escrow.connect(senderAddr).createTransferAccountThis(
        receiverAddr.address,
        10,
        transfer_id
      );

      const withdrawTx = await escrow.connect(executorAddr).withdrawFromEscrowThis(
        senderAddr.address, // sender
        receiverAddr.address, // receiver
        100,
        transfer_id
      );
      const deleteTransferAccountTx = await escrow.connect(executorAddr).deleteTransferAccount(
        transfer_id
      );

      const deleteUnlockedTx = await escrow.connect(executorAddr).deleteUnlocked(
        transfer_id
      );

    });
  });
});

