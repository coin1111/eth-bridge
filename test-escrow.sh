# deposit pete to transfer to todd
npx ts-node  npx-scripts/deposit.ts pete todd 10

# withdraw
npx ts-node  npx-scripts/withdraw.ts pete todd 10

# close transfer accounts sender
npx ts-node  npx-scripts/close_transfer.ts true

# close transfer accounts receiver
npx ts-node  npx-scripts/close_transfer.ts false

# get todd's balance - 10
npx ts-node  npx-scripts/get_balance.ts todd


