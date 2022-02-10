//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract BridgeEscrow {
    string private greeting;

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
        AccountInfo[] locked;
        AccountInfo[] unlocked;
        uint64 balance;
    }

    constructor(string memory _greeting) {
        console.log("Deploying a BridgeEscrow with greeting:", _greeting);
        greeting = _greeting;
    }

    // Creates an account for transfer between 0L->0L accounts
    // Used for testing purposes
    // When user initiates a transfer it calls this method which
    // moves funds from user account into an escrow account.
    // It also creates an entry in locked to indicate such transfer.
    // Executed under user account
    function createTransferAccountThis(
                                        address receiver_address,
                                        uint64 amount,
                                        bytes16 transfer_id) public {
        bytes16 empty; 
        createTransferAccountAux(receiver_address,
            empty, amount, transfer_id);
    }

    // Creates an account for transfer between 0L->eth accounts
    // When user initiates a transfer it calls this method which
    // moves funds from user account into an escrow account.
    // It also creates an entry in locked to indicate such transfer.
    // Executed under user account
     function createTransferAccount(
                                            bytes16 receiver_address,
                                            uint64 amount,
                                            bytes16 transfer_id) public  {
        address zero = 0x0000000000000000000000000000000000000000;
        createTransferAccountAux(zero,
            receiver_address, amount, transfer_id);
    }

    function createTransferAccountAux(
                                    address receiver_this,
                                    bytes16 receiver_other,
                                    uint64 amount,
                                    bytes16 transfer_id) public {
        console.log("Inside create_transfer_account_aux");
    }


    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        console.log("Changing greeting from '%s' to '%s'", greeting, _greeting);
        greeting = _greeting;
    }
}
