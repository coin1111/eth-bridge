import { expect } from "chai";
import { ethers } from "hardhat";

describe("BridgeEscrow", function () {
  let OLToken;
  let olToken;
  let owner;
  let executorAddr;
  let senderAddr;
  let receiverAddr;
  let addrs;
  const COIN_SCALING_FACTOR = 1000000;
  const COIN_SUPPLY = 1000;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    OLToken = await ethers.getContractFactory("OLToken");
    [owner, executorAddr, senderAddr, receiverAddr, ...addrs] = await ethers.getSigners();

    olToken = await OLToken.deploy((COIN_SUPPLY*COIN_SCALING_FACTOR).toString());
    await olToken.deployed();
    console.log("0LToken deployed to:", olToken.address);

    const ownerBalance = await olToken.balanceOf(owner.address);
    expect(await olToken.totalSupply()).to.equal(ownerBalance);


    // Transfer 100 tokens from owner to addr1
    await olToken.transfer(senderAddr.address, 100);
    const addr1Balance = await olToken.balanceOf(senderAddr.address);
    expect(addr1Balance).to.equal(100);
  });

  describe("BridgeEscrowDepositWithdraw", function () {
    it("Should return the new greeting once it's changed", async function () {

      const Greeter = await ethers.getContractFactory("BridgeEscrow");
      const greeter = await Greeter.deploy("Hello, world! BridgeEscrow");
      await greeter.deployed();

      const [owner, executorAddr, senderAddr, receiverAddr] = await ethers.getSigners();
      const  transfer_id = "0xeab47fa3a3dc42bc8cbc48c02182669d";
      const depositTx = await greeter.connect(senderAddr).createTransferAccountThis(
        receiverAddr.address,
        100,
        transfer_id
      );

      const withdrawTx = await greeter.connect(executorAddr).withdrawFromEscrowThis(
        senderAddr.address, // sender
        receiverAddr.address, // receiver
        100,
        transfer_id
      );
      const deleteTransferAccountTx = await greeter.connect(executorAddr).deleteTransferAccount(
        transfer_id
      );

      const deleteUnlockedTx = await greeter.connect(executorAddr).deleteUnlocked(
        transfer_id
      );

    });
  });
});

