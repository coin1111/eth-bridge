# 0L Bridge Ethereum Development Network

This project sets up local dev net running under hardhat and implements 0L Bridge Escrow contract for Ethereum

## Install
```
./setup-hardhat.sh
```

## Compile contract
```
npx hardhat compile
```

## Test contract
```
npx hardhat test
```

## Test contracts on local network
1. Run test network
```
./run-local-node.sh
```
2. Deploy contracts
```
./deploy-local.sh
```
3. Run contract methods
```
cd integration-tests
./test-escrow.sh
```
Contract addresses are saved in .escrow_bridge.config 

## Run Demo ETH agent
This is a depo agent to transfer funds from ETH to ETH. The agent periodically checks pending transfers and processes them
1. Start local test network and deploy contracts
```
./run-local-node.sh
./deploy-local.sh
```
2. run integration tests
```
cd integration-tests
./test-escrow.sh
# inspect output
```

3. Deposit funds
```
# receiver address on 0: chain: 0x06505CCD81E562B524D8F656ABD92A15
export transfer_id=0xeab47fa3a3dc42bc8cbc48c02182669d
npx ts-node  npx-scripts/deposit.ts pete 0x06505CCD81E562B524D8F656ABD92A15 10 "$transfer_id"
```
4. Check balance
```
npx ts-node  npx-scripts/get_balance.ts todd
```
## Generate ABI
```
yarn run hardhat export-abi
```

Abis can be hound under abi directory

## Project Structure
* abi - abis for bridge contract
* accounts- ETH accounts used for dev and testing
* contracts - bridge ans 0LToken contracts
* integration-tests - end-to-end tests
* npx-scripts - cli scripts to manage bridge contract
