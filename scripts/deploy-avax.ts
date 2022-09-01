// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import * as fs from 'fs';
import { ERC20__factory } from "../typechain/factories/ERC20__factory";
import { BridgeEscrowMultisig__factory } from "../typechain/factories/BridgeEscrowMultisig__factory";
import { OLToken, BridgeEscrow, BridgeEscrowMultisig } from "../typechain";
import { url } from "inspector";

const COIN_SCALING_FACTOR = 1000000;
const COIN_SUPPLY = 1000;

async function main() {

  let minVotes = 1;
  const minVotesEnv: string | undefined = process.env.ETH_BRIDGE_ESCROW_MIN_VOTES;
  minVotes = Number(minVotesEnv);
  if (minVotes == 0) {
    minVotes = 1;
  }

  console.log("Deploying contract with minVotes: ", minVotes);

  let provider = ethers.getDefaultProvider();
  const gasLimit = 6000000;
  const gasPrice = 50000000000;

  let owner = ethers.Wallet.fromMnemonic("crack switch convince advance sea virus coast disease attack impose hint neutral").connect(provider);
  let alice = ethers.Wallet.fromMnemonic("crack switch convince advance sea virus coast disease attack impose hint neutral", `m/44'/60'/0'/0/1`).connect(provider);
  let bob = ethers.Wallet.fromMnemonic("crack switch convince advance sea virus coast disease attack impose hint neutral", `m/44'/60'/0'/0/2`).connect(provider);
  let carol = ethers.Wallet.fromMnemonic("crack switch convince advance sea virus coast disease attack impose hint neutral", `m/44'/60'/0'/0/3`).connect(provider);
  let pete = ethers.Wallet.fromMnemonic("crack switch convince advance sea virus coast disease attack impose hint neutral", `m/44'/60'/0'/0/4`).connect(provider);
  let todd = ethers.Wallet.fromMnemonic("crack switch convince advance sea virus coast disease attack impose hint neutral", `m/44'/60'/0'/0/5`).connect(provider);
  let bridgeEscrow = ethers.Wallet.fromMnemonic("crack switch convince advance sea virus coast disease attack impose hint neutral", `m/44'/60'/0'/0/6`).connect(provider);

  console.log("Alice address: ", alice.address);
  console.log("Bob address: ", bob.address);
  console.log("Carol address: ", carol.address);
  console.log("pete address: ", pete.address);
  console.log("todd address: ", todd.address);
 
  let deploy = false;
  let olToken : OLToken;
  let escrow: BridgeEscrowMultisig;
  if (deploy) {
  //Deploy ERC20 token contract
  let OLToken = await ethers.getContractFactory("OLToken", owner);  
  olToken = await OLToken
    .deploy((COIN_SUPPLY * COIN_SCALING_FACTOR).toString(),
    {gasLimit: gasLimit, gasPrice: gasPrice});
  await olToken.deployed();
  console.log("0LToken contract:", olToken.address);
  } else {
    let olTokenAddr = "0x1ce86dfb96ca0c4ee568c42de90dcbd8f70db7f8";
    olToken = ERC20__factory.connect(olTokenAddr, provider);
  }

  if (deploy) {
      // Deploy BridgeEscrow contract
      const BridgeEscrow = await ethers.getContractFactory("BridgeEscrowMultisig", owner);
      console.log("Deploy BridgeEscrow contract:");
      escrow = await BridgeEscrow
        .deploy(olToken.address, [alice.address, bob.address], minVotes,
          {gasLimit: gasLimit, gasPrice: gasPrice});
      await escrow.deployed();
      console.log("BridgeEscrow contract:", escrow.address);
  } else {
    let escrowAddr = "0xc8a5a37c3b5307a10c563ded70ba8c482ef10608";
    escrow = BridgeEscrowMultisig__factory.connect(escrowAddr, provider);
  }

  const avaxUrl = "https://api.avax-test.network/ext/bc/C/rpc";
  provider = new ethers.providers.JsonRpcProvider(avaxUrl);


  // Transfer 100 tokens from owner to pete
  //await olToken.connect(owner.connect(provider)).transfer(pete.address, 100,  {gasLimit: 200000, gasPrice: gasPrice});

  // Transfer 1000000 tokens from owner to escrow account
  await olToken.connect(owner.connect(provider)).transfer(escrow.address, 1000000,  {gasLimit: 200000, gasPrice: gasPrice});

  // save addresses to config
  let config: any = {
    olTokenContract: olToken.address,
    escrowContract: escrow.address,
    url: avaxUrl,
    gasPrice: gasPrice,
  }
  fs.writeFile(".bridge_escrow_avax.config", JSON.stringify(config), function (err) {
    if (err) {
      console.log(err);
    }
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
