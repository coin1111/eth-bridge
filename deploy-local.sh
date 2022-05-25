
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then 
    echo 'deploy.sh <min-votes>'
    exit 0
fi
export ETH_BRIDGE_ESCROW_MIN_VOTES="$1"
npx hardhat run --show-stack-traces --network localhost scripts/deploy.ts
