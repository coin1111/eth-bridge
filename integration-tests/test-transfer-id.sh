# test that transfer_id can be used to track transfer

transfer_id=0xaab47fa3a3dc42bc8cbc48c02182669a
pushd ..
# deposit pete to transfer to todd
npx ts-node  npx-scripts/deposit.ts pete todd 10 "$transfer_id"

# withdraw
npx ts-node  npx-scripts/withdraw.ts pete todd 10 "$transfer_id"

# close transfer accounts sender
npx ts-node  npx-scripts/close_transfer.ts true "$transfer_id"

# close transfer accounts receiver
npx ts-node  npx-scripts/close_transfer.ts false "$transfer_id"

# get todd's balance - 10
# Balance:  BigNumber { _hex: '0x14', _isBigNumber: true }
npx ts-node  npx-scripts/get_balance.ts todd
popd


