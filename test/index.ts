import { expect } from "chai";
import { ethers } from "hardhat";

describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {
    const Greeter = await ethers.getContractFactory("Greeter");
    const greeter = await Greeter.deploy("Hello, world!");
    await greeter.deployed();

    expect(await greeter.greet()).to.equal("Hello, world!");

    const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});

describe("BridgeEscrow", function () {
  it("Should return the new greeting once it's changed", async function () {
    const Greeter = await ethers.getContractFactory("BridgeEscrow");
    const greeter = await Greeter.deploy("Hello, world! BridgeEscrow");
    await greeter.deployed();

    expect(await greeter.greet()).to.equal("Hello, world! BridgeEscrow");

    const setGreetingTx = await greeter.setGreeting("Hola, mundo! BridgeEscrow");

    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await greeter.greet()).to.equal("Hola, mundo! BridgeEscrow");
  });
});

describe("BridgeEscrowDepositWithdraw", function () {
  it("Should return the new greeting once it's changed", async function () {
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

