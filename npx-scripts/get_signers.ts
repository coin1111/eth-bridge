import { ethers } from "ethers";
import * as fs from 'fs';

export function getSigner(signers: Map<string, ethers.Wallet>, nick: string): ethers.Wallet {
  if (!signers.has(nick)) {
    throw new TypeError("ERROR: invalid nick: " + nick);
  }
  let user: ethers.Wallet;
  if (!nick.startsWith("0x")) {
    user = (signers.get(nick) as ethers.Wallet);
  } else {
    user = new ethers.Wallet(nick);
  }
  return user;
}
function getPrivateKey(fName: string) {
  let a = fs.readFileSync(fName, 'utf8').toString().split("\n");
  return a[1].split(":")[1].trim();
}
export function getSigners(): Map<string, ethers.Wallet> {
  let aliceKey = getPrivateKey("accounts/alice.txt");
  let bobKey = getPrivateKey("accounts/bob.txt");
  let carolKey = getPrivateKey("accounts/carol.txt");
  let peteKey = getPrivateKey("accounts/pete.txt");
  let toddKey = getPrivateKey("accounts/todd.txt");
  let bridgeEscrowKey = getPrivateKey("accounts/bridgeEscrow.txt");
  console.log("Alice: ", aliceKey);
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
export function getConfig(): any {
  let configJson: any = fs.readFileSync(".bridge_escrow.config", 'utf8').toString().trimEnd();
  return JSON.parse(configJson);
}
