//SPDX-License-Identifier: Unlicense

pragma solidity 0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./OLToken.sol";

contract BridgeEscrow is ReentrancyGuard {
    struct AccountInfo {
        // user address on this chain
        // eth->0L transfer
        address senderThis;
        // user address on the other chain
        // eth->0L transfer
        bytes32 senderOther;
        // user address on the other chain
        // receiver address on eth chain
        // 0L->eth transfer
        address payable receiverThis;
        // receiver address on eth chain
        // eth->0L transfer
        bytes32 receiverOther;
        // value sent
        uint256 balance;
        // transfer id
        bytes32 transferId;
    }

    struct EscrowState {
        mapping(bytes32 => AccountInfo) locked;
        mapping(bytes32 => AccountInfo) unlocked;
        uint256 balance;
    }
    EscrowState private escrowState;

    address public owner;
    address public executor;
    IERC20 private olToken;

    address payable public constant ZERO_ADDRESS_PAYABLE = payable(address(0));
    address public constant ZERO_ADDRESS = address(0);
    bytes32 public constant EMPTY_BYTES = bytes32(0);

    modifier onlyExecutor() {
        require(msg.sender == executor, "!executor");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }

    constructor(address olTokenAddr, address executorAddr) {
        console.log("Deploying a BridgeEscrow: for token");
        owner = msg.sender;
        olToken = OLToken(olTokenAddr);
        executor = executorAddr;
    }

    /// @dev Modified version of createTransferAccount(). Used for testing purposes
    function createTransferAccountThis(
        address payable receiverAddress,
        uint256 amount,
        bytes32 transferId
    ) public payable {
        createTransferAccountAux(
            msg.sender,
            EMPTY_BYTES,
            receiverAddress,
            EMPTY_BYTES,
            amount,
            transferId
        );
    }

    /// @dev Creates an account for transfer between 0L->eth accounts
    /// When user initiates a transfer it calls this method which
    /// moves funds from user account into an escrow account.
    /// It also creates an entry in locked to indicate such transfer.
    /// Executed under user account
    /// @param receiverAddress Recepient address
    /// @param amount Funds to transfer for accountthis
    /// @param transferId Transfer identifier
    function createTransferAccount(
        bytes32 receiverAddress,
        uint256 amount,
        bytes32 transferId
    ) public payable {
        createTransferAccountAux(
            ZERO_ADDRESS,
            EMPTY_BYTES,
            ZERO_ADDRESS_PAYABLE,
            receiverAddress,
            amount,
            transferId
        );
    }

    function createTransferAccountAux(
        address senderThis,
        bytes32 senderOther,
        address payable receiverThis,
        bytes32 receiverOther,
        uint256 amount,
        bytes32 transferId
    ) public payable nonReentrant {
        console.log("Inside create_transfer_account_aux %s", msg.sender);

        // amount must be positive
        require(amount > 0, "amount must be positive");
        // destination address must be valid
        if (receiverThis == ZERO_ADDRESS_PAYABLE) {
            require(
                receiverOther != EMPTY_BYTES,
                "receiver must be a valid address"
            );
        }
        // check if transferId is present
        require(
            escrowState.locked[transferId].transferId == 0x0,
            "transferId exists"
        );

        // transfer funds
        olToken.transferFrom(msg.sender, address(this), amount);

        // create transfer entry
        escrowState.locked[transferId] = AccountInfo({
            senderThis: senderThis,
            senderOther: senderOther,
            receiverThis: receiverThis,
            receiverOther: receiverOther,
            balance: amount,
            transferId: transferId
        });
    }

    /* =============== Executor mode ==================== */
    /// @dev Modified from withdrawFromEscrow. Used for testing purposes
    function withdrawFromEscrowThis(
        address senderAddress, // sender on this  chain
        address payable receiverAddress, // receiver on this chain
        uint256 balance, // balance to transfer
        bytes32 transferId // transferId
    ) external onlyExecutor {
        withdrawFromEscrowAux(
            senderAddress,
            EMPTY_BYTES,
            receiverAddress,
            balance,
            transferId
        );
    }

    /// @dev Moves funds from escrow account to user account between eth->0L accounts
    /// Creates an entry in unlocked vector to indicate such transfer.
    /// Executed under escrow account
    ///  @param senderAddress sender on the other chain
    ///  @param receiverAddress receiver on this chain
    ///  @param balance balance to transfer
    ///  @param transferId Transfer identifier
    function withdrawFromEscrow(
        bytes32 senderAddress,
        address payable receiverAddress,
        uint256 balance,
        bytes32 transferId
    ) external onlyExecutor {
        withdrawFromEscrowAux(
            ZERO_ADDRESS,
            senderAddress,
            receiverAddress,
            balance,
            transferId
        );
    }

    /// @dev Moves funds from escrow account to user account.
    /// Creates an entry in unlocked vector to indicate such transfer.
    /// Executed under escrow account
    ///  @param senderThis sender on this  chain
    ///  @param senderOther sender on the other chain
    ///  @param receiverThis receiver on this chain
    ///  @param balance balance to transfer
    ///  @param transferId Transfer identifier
    function withdrawFromEscrowAux(
        address senderThis,
        bytes32 senderOther,
        address payable receiverThis,
        uint256 balance,
        bytes32 transferId
    ) public onlyExecutor nonReentrant {
        console.log("Inside withdrawFromEscrowAux %s", msg.sender);
        // amoubalancent must be positive
        require(balance > 0, "balance must be positive");
        // destination address must be valid
        require(
            receiverThis != ZERO_ADDRESS_PAYABLE,
            "receiver must be a valid address"
        );
        if (senderThis == ZERO_ADDRESS) {
            require(
                senderOther != EMPTY_BYTES,
                "sender must be a valid address"
            );
        }
        // check if transferId is present
        require(
            escrowState.unlocked[transferId].transferId == 0x0,
            "transferId exists"
        );
        escrowState.unlocked[transferId] = AccountInfo({
            senderThis: senderThis,
            senderOther: senderOther,
            receiverThis: receiverThis,
            receiverOther: EMPTY_BYTES,
            balance: balance,
            transferId: transferId
        });
        olToken.transfer(receiverThis, balance);
    }

    /// @dev Remove transfer account when transfer is completed
    /// Removes entry in locked vector.
    /// Executed under escrow account
    /// @param transferId Identifier
    function closeTransferAccountSender(bytes32 transferId)
        external
        onlyExecutor
    {
        require(
            escrowState.locked[transferId].transferId != 0x0,
            "transferId must exist"
        );
        // delete (reset) entry in locked
        escrowState.locked[transferId] = AccountInfo({
            senderThis: ZERO_ADDRESS,
            senderOther: EMPTY_BYTES,
            receiverThis: ZERO_ADDRESS_PAYABLE,
            receiverOther: EMPTY_BYTES,
            balance: 0,
            transferId: EMPTY_BYTES
        });
    }

    function closeTransferAccountReceiver(bytes32 transferId)
        external
        onlyExecutor
    {
        require(
            escrowState.unlocked[transferId].transferId != 0x0,
            "transferId must exist"
        );
        // delete (reset) entry in unlocked
        escrowState.unlocked[transferId] = AccountInfo({
            senderThis: ZERO_ADDRESS,
            senderOther: EMPTY_BYTES,
            receiverThis: ZERO_ADDRESS_PAYABLE,
            receiverOther: EMPTY_BYTES,
            balance: 0,
            transferId: EMPTY_BYTES
        });
    }

    /* =============== Owner mode ==================== */

    /// @dev Owner removes funds from contract
    function call(
        address payable _to,
        uint256 _value,
        bytes calldata _data
    ) external payable onlyOwner returns (bytes memory) {
        require(_to != address(0), "cannot burn funds");
        // solhint-disable-next-line avoid-low-level-calls
        (bool _success, bytes memory _result) = _to.call{value: _value}(_data);
        require(_success, "unsucessful tx");
        return _result;
    }
}
