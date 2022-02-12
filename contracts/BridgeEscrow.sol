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
    }

    struct EscrowState {
        mapping(bytes16 => AccountInfo) locked;
        mapping(bytes16 => AccountInfo) unlocked;
        uint64 balance;
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

    constructor(address olTokenAddr,
                address executorAddr) {
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
        escrowState.locked[transfer_id] = AccountInfo({
            sender_this: sender_this,
            sender_other: sender_other,
            receiver_this: receiver_this,
            receiver_other: receiver_other,
            balance: amount,
            transfer_id: transfer_id
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
            transfer_id: transfer_id
        });
        olToken.transfer(receiver_this, balance);
    }

    // Remove transfer account when transfer is completed
    // Removes entry in locked vector.
    // Executed under escrow account
    function closeTransferAccountSender(bytes16 transfer_id) public onlyExecutor {
        require(
            escrowState.locked[transfer_id].transfer_id != 0x0,
            "transfer_id must exist"
        );
        // delete (reset) entry in locked
        escrowState.locked[transfer_id] = AccountInfo({
            sender_this: ZERO_ADDRESS,
            sender_other: EMPTY_BYTES,
            receiver_this: ZERO_ADDRESS_PAYABLE,
            receiver_other: EMPTY_BYTES,
            balance: 0,
            transfer_id: EMPTY_BYTES
        });
    }

    function closeTransferAccountReceiver(bytes16 transfer_id) public onlyExecutor {
        require(
            escrowState.unlocked[transfer_id].transfer_id != 0x0,
            "transfer_id must exist"
        );
        // delete (reset) entry in unlocked
        escrowState.unlocked[transfer_id] = AccountInfo({
            sender_this: ZERO_ADDRESS,
            sender_other: EMPTY_BYTES,
            receiver_this: ZERO_ADDRESS_PAYABLE,
            receiver_other: EMPTY_BYTES,
            balance: 0,
            transfer_id: EMPTY_BYTES
        });
    }
}
