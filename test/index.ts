import { expect } from "chai";
import { ethers } from "hardhat";


describe("BridgeEscrowDepositWithdraw", function () {
  it("Should return the new greeting once it's changed", async function () {
    // deploy 0L ERC20 token
    const COIN_SCALING_FACTOR = 1000000;
    const COIN_SUPPLY = 1000;
    const OLToken = await ethers.getContractFactory("OLToken");
    console.log('Deploying OLToken...');
    const token = await OLToken.deploy((COIN_SUPPLY*COIN_SCALING_FACTOR).toString());
    await token.deployed();
    console.log("GLDToken deployed to:", token.address);

    const Greeter = await ethers.getContractFactory("BridgeEscrow");
    const greeter = await Greeter.deploy("Hello, world! BridgeEscrow");
    await greeter.deployed();

    const [owner, executorAddr, sender, receiver] = await ethers.getSigners();
    const  transfer_id = "0xeab47fa3a3dc42bc8cbc48c02182669d";
    const depositTx = await greeter.connect(sender).createTransferAccountThis(
      receiver.address,
      100,
      transfer_id
    );

    const withdrawTx = await greeter.connect(executorAddr).withdrawFromEscrowThis(
      sender.address, // sender
      receiver.address, // receiver
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

