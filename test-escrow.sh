# deposit pete to transfer to todd
npx ts-node  npx-scripts/deposit.ts pete todd 10

# withdraw
npx ts-node  npx-scripts/withdraw.ts pete todd 10

# get todd's balance - 10
npx ts-node  npx-scripts/get_balance.ts todd

# close transfer accounts
npx hardhat run --network localhost scripts/close_transfer.ts


