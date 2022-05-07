//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./OLToken.sol";

contract BridgeEscrowMultisig {
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
        // votes
        address[] votes;
        uint8 currentVotes;
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
    mapping(address => bool) public executors; // allowed executors
    uint8 public minVotesRequired; // min signatures required to execute contract methods
    uint8 public totalExecutors;
    IERC20 private olToken;

    address payable ZERO_ADDRESS_PAYABLE =
        payable(address(0x0000000000000000000000000000000000000000));
    address ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
    bytes16 EMPTY_BYTES;

    EscrowState private escrowState;

    modifier onlyExecutor() {
        require(executors[msg.sender], "not executor");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor(address olTokenAddr, address[] memory allowedExecutors, uint8 minVotes) {
        console.log("Deploying a BridgeEscrow: for token");
        owner = msg.sender;
        olToken = OLToken(olTokenAddr);

        // multisig init
        require(minVotes < 256,
            "MinVotes must be less than 256");

        require(allowedExecutors.length < 256,
            "Number of allowed executors must be less than 256");

        require(allowedExecutors.length >= minVotes,
            "Number of signers allowed must be at least minSignatures");

        for (uint8 i = 0; i < allowedExecutors.length; i++) {
            require(allowedExecutors[i] != address(0), "Invalid signer");
            executors[allowedExecutors[i]] = true;
        }
        totalExecutors = uint8(allowedExecutors.length);
        minVotesRequired = minVotes;
    }

    // Creates an account for transfer between ETH->0L accounts
    // When user initiates a transfer it calls this method which
    // moves funds from user account into an escrow account.
    // It also creates an entry in locked to indicate such transfer.
    // Executed under user account
    function createTransferAccount(
        bytes16 receiver_other,
        uint64 amount,
        bytes16 transfer_id
    ) public payable {
        console.log("Inside create_transfer_account%s", msg.sender);
        // amount must be positive
        require(amount > 0, "amount must be positive");
        // destination address must be valid
        require(
            receiver_other != EMPTY_BYTES,
            "receiver must be a valid address"
        );
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
            sender_this: msg.sender,
            sender_other: EMPTY_BYTES,
            receiver_this: ZERO_ADDRESS_PAYABLE,
            receiver_other: receiver_other,
            balance: amount,
            transfer_id: transfer_id,
            locked_idx: escrowState.locked_idxs.length - 1,
            is_closed: false,
            votes: new address[](minVotesRequired),
            currentVotes: 0
        });
    }

    // Moves funds from escrow account to user account between 0L->eth accounts
    // Creates an entry in unlocked vector to indicate such transfer.
    // Executed under escrow account
    function withdrawFromEscrow(
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
        require(
            sender_other != EMPTY_BYTES,
            "sender must be a valid address"
        );
        // if this is the first call init transfer entry
        AccountInfo storage ai_unlocked;
        if (escrowState.unlocked[transfer_id].currentVotes == 0) {
            escrowState.unlocked[transfer_id] = AccountInfo({
                sender_this: ZERO_ADDRESS,
                sender_other: sender_other,
                receiver_this: receiver_this,
                receiver_other: EMPTY_BYTES,
                balance: balance,
                transfer_id: transfer_id,
                locked_idx: 0,
                is_closed: false, // transfer is pending
                votes: new address[](minVotesRequired),
                currentVotes: 0
            });
            ai_unlocked = escrowState.unlocked[transfer_id];
        } else {
            ai_unlocked = escrowState.unlocked[transfer_id];
            // make sure account is not closed
            require(ai_unlocked.is_closed == false,
                "transfer has been completed already");
            // make sure that voter call params matches other voters
            require(
                ai_unlocked.sender_other == sender_other &&
                ai_unlocked.receiver_this == receiver_this &&
                ai_unlocked.balance == balance,
                "invalid withdraw parameters");
        }

        // update vote count
        // if not enough votes, then return
        if (updateVotes(ai_unlocked, msg.sender) == false) {
            return;
        }

        // enough votes have been cast, do withdrawal
        ai_unlocked.is_closed = true; // transfer happened, close transfer
        // transfer funds to receiver
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

        require(
            escrowState.locked[transfer_id].is_closed == false,
            "transfer is completed already"
        );

        // if there is already enough votes , then nothing to do
        AccountInfo storage ai_locked = escrowState.locked[transfer_id];
        if (updateVotes(ai_locked, msg.sender) == false) {
            return;
        }

        // collected enough votes, execute
        // remove entry from index
        escrowState.locked_idxs[ai_locked.locked_idx] = 0;
        // close locked entry
        ai_locked.locked_idx = 0;
        ai_locked.is_closed = true;
    }

    function getLockedLength() public view returns (uint256) {
        return escrowState.locked_idxs.length;
    }

    function updateVotes(AccountInfo storage ai, address voter) 
        private
        returns (bool) {
        if (ai.currentVotes >= minVotesRequired) {
            require(false, "min votes reached");
        }
        // check if sender already voted
        for (uint8 i = 0; i < ai.currentVotes; i++) {
            if (ai.votes[i] == voter) {
                require(false, "sender already voted");
            }
        }
        // add voter
        ai.votes[ai.currentVotes] = voter;
        ai.currentVotes +=1;

        // if not enough votes, then return
        if (ai.currentVotes < minVotesRequired) {
            return false;
        }
        return true;
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
