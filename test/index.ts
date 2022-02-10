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

describe("BridgeEscrow_deposit", function () {
  it("Should return the new greeting once it's changed", async function () {
    const Greeter = await ethers.getContractFactory("BridgeEscrow");
    const greeter = await Greeter.deploy("Hello, world! BridgeEscrow");
    await greeter.deployed();

    expect(await greeter.greet()).to.equal("Hello, world! BridgeEscrow");

    const setGreetingTx = await greeter.create_transfer_account_this(
      "0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8",
      100,
      "0xeab47fa3a3dc42bc8cbc48c02182669d"
    );

    // wait until the transaction is mined
    await setGreetingTx.wait();
  });
});
