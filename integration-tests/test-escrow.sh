# test that basic transfer works
uuid=$(echo $(uuidgen) | sed s/-//g)
transfer_id=0x"$uuid"
pushd ..
# deposit pete to transfer to todd
npx ts-node  npx-scripts/deposit.ts pete 0x06505CCD81E562B524D8F656ABD92A15 10 "$transfer_id"

# withdraw
npx ts-node  npx-scripts/withdraw.ts 0x06505CCD81E562B524D8F656ABD92A15 todd 10 "$transfer_id"

# close transfer accounts sender
npx ts-node  npx-scripts/close_transfer.ts "$transfer_id"

# get todd's balance - 10
# Balance:  BigNumber { _hex: '0x14', _isBigNumber: true }
npx ts-node  npx-scripts/get_balance.ts todd
popd


