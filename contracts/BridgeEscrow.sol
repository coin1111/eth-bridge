//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./OLToken.sol";

contract BridgeEscrow {
    struct AccountInfo {
        // user address on this chain
        // eth->0L transfer
        address sender_this;
        // user address on the other chain
        // eth->0L transfer
        bytes16 sender_other;
        // user address on the other chain
        // receiver address on eth chain
        // 0L->eth transfer
        address payable receiver_this;
        // receiver address on eth chain
        // eth->0L transfer
        bytes16 receiver_other;
        // value sent
        uint64 balance;
        // transfer id
        bytes16 transfer_id;
        // index of this entry in locked_idx;
        uint256 locked_idx;
        // indicates if this account has been closed
        bool is_closed;
    }

    struct EscrowState {
        // records of deposits
        mapping(bytes16 => AccountInfo) locked;
        // records of withdrawals
        mapping(bytes16 => AccountInfo) unlocked;
        // total balance deposited into contract
        uint64 balance;
        // list of transfer_ids of deposits which need to be processed
        bytes16[] locked_idxs;
    }

    address public owner;
    address public executor;
    IERC20 private olToken;

    address payable ZERO_ADDRESS_PAYABLE =
        payable(address(0x0000000000000000000000000000000000000000));
    address ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
    bytes16 EMPTY_BYTES;

    EscrowState private escrowState;

    modifier onlyExecutor() {
        require(msg.sender == executor);
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor(address olTokenAddr, address executorAddr) {
        console.log("Deploying a BridgeEscrow: for token");
        owner = msg.sender;
        olToken = OLToken(olTokenAddr);
        executor = executorAddr;
    }

    // Creates an account for transfer between 0L->0L accounts
    // Used for testing purposes
    // When user initiates a transfer it calls this method which
    // moves funds from user account into an escrow account.
    // It also creates an entry in locked to indicate such transfer.
    // Executed under user account
    function createTransferAccountThis(
        address payable receiver_address,
        uint64 amount,
        bytes16 transfer_id
    ) public payable {
        createTransferAccountAux(
            msg.sender,
            EMPTY_BYTES,
            receiver_address,
            EMPTY_BYTES,
            amount,
            transfer_id
        );
    }

    // Creates an account for transfer between 0L->eth accounts
    // When user initiates a transfer it calls this method which
    // moves funds from user account into an escrow account.
    // It also creates an entry in locked to indicate such transfer.
    // Executed under user account
    function createTransferAccount(
        bytes16 receiver_address,
        uint64 amount,
        bytes16 transfer_id
    ) public payable {
        createTransferAccountAux(
            ZERO_ADDRESS,
            EMPTY_BYTES,
            ZERO_ADDRESS_PAYABLE,
            receiver_address,
            amount,
            transfer_id
        );
    }

    function createTransferAccountAux(
        address sender_this,
        bytes16 sender_other,
        address payable receiver_this,
        bytes16 receiver_other,
        uint64 amount,
        bytes16 transfer_id
    ) public payable {
        console.log("Inside create_transfer_account_aux %s", msg.sender);
        // amount must be positive
        require(amount > 0, "amount must be positive");
        // destination address must be valid
        if (receiver_this == ZERO_ADDRESS_PAYABLE) {
            require(
                receiver_other != EMPTY_BYTES,
                "receiver must be a valid address"
            );
        }
        // check if transfer_id is present
        require(
            escrowState.locked[transfer_id].transfer_id == 0x0,
            "transfer_id exists"
        );

        // transfer funds

        olToken.transferFrom(msg.sender, address(this), amount);

        // create transfer entry
        escrowState.locked_idxs.push(transfer_id);
        escrowState.locked[transfer_id] = AccountInfo({
            sender_this: sender_this,
            sender_other: sender_other,
            receiver_this: receiver_this,
            receiver_other: receiver_other,
            balance: amount,
            transfer_id: transfer_id,
            locked_idx: escrowState.locked_idxs.length - 1,
            is_closed: false
        });
    }

    function withdrawFromEscrowThis(
        address sender_address, // sender on this  chain
        address payable receiver_address, // receiver on this chain
        uint64 balance, // balance to transfer
        bytes16 transfer_id // transfer_id
    ) public onlyExecutor {
        withdrawFromEscrowAux(
            sender_address,
            EMPTY_BYTES,
            receiver_address,
            balance,
            transfer_id
        );
    }

    // Moves funds from escrow account to user account between eth->0L accounts
    // Creates an entry in unlocked vector to indicate such transfer.
    // Executed under escrow account
    function withdrawFromEscrow(
        bytes16 sender_address, // sender on the other chain
        address payable receiver_address, // receiver on this chain
        uint64 balance, // balance to transfer
        bytes16 transfer_id // transfer_id
    ) public onlyExecutor {
        withdrawFromEscrowAux(
            ZERO_ADDRESS,
            sender_address,
            receiver_address,
            balance,
            transfer_id
        );
    }

    // Moves funds from escrow account to user account.
    // Creates an entry in unlocked vector to indicate such transfer.
    // Executed under escrow account
    function withdrawFromEscrowAux(
        address sender_this, // sender on this  chain
        bytes16 sender_other, // sender on the other chain
        address payable receiver_this, // receiver on this chain
        uint64 balance, // balance to transfer
        bytes16 transfer_id // transfer_id
    ) public onlyExecutor {
        console.log("Inside withdrawFromEscrowAux %s", msg.sender);
        // amoubalancent must be positive
        require(balance > 0, "balance must be positive");
        // destination address must be valid
        require(
            receiver_this != ZERO_ADDRESS_PAYABLE,
            "receiver must be a valid address"
        );
        if (sender_this == ZERO_ADDRESS) {
            require(
                sender_other != EMPTY_BYTES,
                "sender must be a valid address"
            );
        }
        // check if transfer_id is present
        require(
            escrowState.unlocked[transfer_id].transfer_id == 0x0,
            "transfer_id exists"
        );
        escrowState.unlocked[transfer_id] = AccountInfo({
            sender_this: sender_this,
            sender_other: sender_other,
            receiver_this: receiver_this,
            receiver_other: EMPTY_BYTES,
            balance: balance,
            transfer_id: transfer_id,
            locked_idx: 0,
            is_closed: true // transfer happened, account closed
        });
        olToken.transfer(receiver_this, balance);
    }

    // Remove transfer account when transfer is completed
    // Removes entry in locked vector.
    // Executed under escrow account
    function closeTransferAccountSender(bytes16 transfer_id)
        public
        onlyExecutor
    {
        require(
            escrowState.locked[transfer_id].transfer_id != 0x0,
            "transfer_id must exist"
        );
        // remove entry from index
        escrowState.locked_idxs[escrowState.locked[transfer_id].locked_idx] = 0;
        // close locked entry
        escrowState.locked[transfer_id].locked_idx = 0;
        escrowState.locked[transfer_id].is_closed = true;
    }

    function getLockedLength() public view returns (uint256) {
        return escrowState.locked_idxs.length;
    }

    // returns next non-zero transfer_id
    function getNextTransferId(uint256 start, uint256 n)
        public
        view
        returns (bytes16, uint256)
    {
        uint256 cnt = 0;
        while (
            start + cnt < escrowState.locked_idxs.length && cnt < n && cnt < 100
        ) {
            bytes16 id = escrowState.locked_idxs[start + cnt];
            if (id != EMPTY_BYTES) {
                return (id, start + cnt + 1);
            }
            cnt += 1;
        }
        return (EMPTY_BYTES, start + cnt);
    }

    function getLockedAccountInfo(bytes16 transferId)
        public
        view
        returns (AccountInfo memory)
    {
        return escrowState.locked[transferId];
    }

    function getUnlockedAccountInfo(bytes16 transferId)
        public
        view
        returns (AccountInfo memory)
    {
        return escrowState.unlocked[transferId];
    }

    // to remove funds from contract
    function call(
        address payable _to,
        uint256 _value,
        bytes calldata _data
    ) external payable onlyOwner returns (bytes memory) {
        require(_to != address(0));
        (bool _success, bytes memory _result) = _to.call{value: _value}(_data);
        require(_success);
        return _result;
    }
}
