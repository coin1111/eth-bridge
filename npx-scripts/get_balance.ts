// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "ethers";
import { ERC20__factory } from "../typechain/factories/ERC20__factory";
import { getConfig, getSigners, getSigner } from "./get_signers";


async function main() {
  let argv = process.argv.slice(2);
  if (argv.length == 0 || argv[0] == "-h" || argv[0] == "--help") {
    console.log("Usage: get_balance.ts address|nick");
    console.log("\t gets balance of 0L token at address or nickname");
    console.log("\t nicknames: alice, bob, carol, pete, todd, bridgeEscrow");
    return;
  }

  // get signers
  let signers = getSigners();


  // get contracts
  let config = getConfig();
  let olTokenAddr = config.olTokenContract;
  let bridgeEscrowAddr = config.escrowContract;
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  let olToken = ERC20__factory.connect(olTokenAddr, provider);
  console.log("OlToken: ", olTokenAddr);

  // Check balance
  if (argv[0].startsWith("0x")){
    console.log("User: ", argv[0]);
    const balance = await olToken.balanceOf(
      argv[0]
    );
    console.log("Balance: ", balance);
  } else {
    let user = getSigner(signers, argv[0]);
    console.log("User: ", user);
    const balance = await olToken.balanceOf(
      user.address
    );
    console.log("Balance: ", balance);
  }

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


