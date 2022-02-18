transfer_id=0xeab47fa3a3dc42bc8cbc48c02182669d

# deposit pete to transfer to todd
npx ts-node  npx-scripts/deposit.ts pete todd 10 "$transfer_id"

# withdraw
npx ts-node  npx-scripts/withdraw.ts pete todd 10 "$transfer_id"

# close transfer accounts sender
npx ts-node  npx-scripts/close_transfer.ts true "$transfer_id"

# close transfer accounts receiver
npx ts-node  npx-scripts/close_transfer.ts false "$transfer_id"

# get todd's balance - 10
npx ts-node  npx-scripts/get_balance.ts todd


