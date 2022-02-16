# deposit pete to transfer to todd
npx hardhat run --network localhost scripts/deposit.ts

# withdraw
npx hardhat run --network localhost scripts/withdraw.ts

# get todd's balance - 10
npx hardhat run --network localhost scripts/get_balance.ts

# close transfer accounts
npx hardhat run --network localhost scripts/close_transfer.ts


