pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OLToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("0L", "OL") {
        _mint(msg.sender, initialSupply);
    }
}