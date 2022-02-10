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

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        console.log("Changing greeting from '%s' to '%s'", greeting, _greeting);
        greeting = _greeting;
    }
}
