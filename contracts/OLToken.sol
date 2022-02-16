// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OLToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("0L", "OL") {
        _mint(msg.sender, initialSupply);
    }
}
