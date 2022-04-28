# test that basic transfer works
transfer_id=0xeab47fa3a3dc42bc8cbc48c02182669d
pushd ..
# deposit pete to transfer to todd
npx ts-node  npx-scripts/deposit.ts pete 0x06505CCD81E562B524D8F656ABD92A1510 "$transfer_id"

# withdraw
npx ts-node  npx-scripts/withdraw.ts 0x06505CCD81E562B524D8F656ABD92A15 todd 10 "$transfer_id"

# close transfer accounts sender
npx ts-node  npx-scripts/close_transfer.ts "$transfer_id"

# get todd's balance - 10
# Balance:  BigNumber { _hex: '0x14', _isBigNumber: true }
npx ts-node  npx-scripts/get_balance.ts todd
popd


