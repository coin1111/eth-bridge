// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "ethers";
import * as fs from 'fs';
import {ERC20__factory} from "../typechain/factories/ERC20__factory";


async function main() {
  let argv = process.argv.slice(2);
  if (argv.length == 0 || argv[0] == "-h" ||  argv[0] == "--help") {
    console.log("Usage: get_balance.ts address|nick");
    console.log("\t gets balance of 0L token at address or nickname");
    console.log("\t nicknames: alice, bob, carol, pete, todd, bridgeEscrow");
    return;
  }

  let config = getConfig();
  let olTokenAddr = config.olTokenContract;
  let bridgeEscrowAddr = config.escrowContract;


  let signers =  getSigners();
  let user = getAddress(signers, argv);


  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

  // Check balance
  let olToken =  ERC20__factory.connect(olTokenAddr, provider);
  console.log("User: ",user);
  console.log("OlToken: ",olTokenAddr);
  const balance = await olToken.balanceOf(
    user
  );
  console.log("Balance: ", balance);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function getAddress(signers: Map<string, ethers.Wallet>, argv: string[]) {
  if (!signers.has(argv[0])) {
    throw new TypeError("ERROR: invalid nick: " + argv[0]);
  }
  let user = argv[0];
  if (!user.startsWith("0x")) {
    user = (signers.get(argv[0]) as ethers.Wallet).address;
  }
  return user;
}

function getPrivateKey(fName: string) {
  let a = fs.readFileSync(fName, 'utf8').toString().split("\n");
  return a[1].split(":")[1].trim();
}

function getSigners() :Map<string, ethers.Wallet>{
  let aliceKey = getPrivateKey("accounts/alice.txt");
  let bobKey = getPrivateKey("accounts/bob.txt");
  let carolKey = getPrivateKey("accounts/carol.txt");
  let peteKey = getPrivateKey("accounts/pete.txt");
  let toddKey = getPrivateKey("accounts/todd.txt");
  let bridgeEscrowKey = getPrivateKey("accounts/bridgeEscrow.txt");
  console.log("Alice: ",aliceKey);
  let alice = new ethers.Wallet(aliceKey);
  let bob = new ethers.Wallet(bobKey);
  let carol = new ethers.Wallet(carolKey);
  let pete = new ethers.Wallet(peteKey);
  let todd = new ethers.Wallet(toddKey);
  let bridgeEscrow = new ethers.Wallet(bridgeEscrowKey);
  let wallets = new Map<string, ethers.Wallet>([
    ["alice", alice],
    ["bob", bob],
    ["carol", carol],
    ["pete", pete],
    ["todd", todd],
    ["bridgeEscrow", bridgeEscrow],
  ]);

  return wallets;
}


function getConfig(): any {
  let configJson: any = fs.readFileSync(".bridge_escrow.config", 'utf8').toString().trimEnd();
  return JSON.parse(configJson);
}

