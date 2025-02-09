//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./openpassport/contracts/contracts/IdentityVerificationHubImplV1.sol";

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

/**
 * A smart contract that requires users to prove their PGP identity for a stake
 * - Users provide their PGP public key
 * - Users stake a certain amount of ETH for the lifetime of the PGP key
 * - Users can get challenged by other users for a fee to prove their PGP identity
 * - If a user is challenged, they have a limited time to prove their identity
 * - If a user is not able to prove their identity, their stake is given to the challenger
 * - If a user is able to prove their identity, they receive the fee and keep their stake
 * 
 * @author MFoCS24
 */
contract StakePGP is IdentityVerificationHubImplV1 {
    // State variables
    struct UserStake {
        string publicKey;      // PGP public key
        uint256 stakedAmount; // Amount of ETH staked
        uint256 challengeDeadline; // Deadline for responding to challenge
        uint256 stakeTimestamp; // When the stake was created
        address challenger;    // Address of the current challenger
        uint256 challengeFee; // Amount of ETH held for current challenge
        bool isStaked;        // Whether this address has an active stake
    }

    mapping(address => UserStake) public stakes;
    mapping(string => address) public keyIDToStaker;
    uint256 public constant CHALLENGE_DURATION = 3 days;
    uint256 public constant MINIMUM_STAKE = 0.1 ether;
    uint256 public constant CHALLENGE_FEE = 0.05 ether;
    uint256 public constant MINIMUM_STAKE_DURATION = 30 days;

    // Events
    event Staked(address indexed user, string publicKey, uint256 amount);
    event Challenged(address indexed user, address indexed challenger);
    event ChallengeResolved(address indexed user, address indexed challenger, bool success);
    event StakeWithdrawn(address indexed user, uint256 amount);
    event LockExtended(address indexed user, uint256 newUnlockTime);

    // Errors
    error InsufficientStake();
    error InsufficientChallengeFee();
    error NoActiveStake();
    error AlreadyStaked();
    error NotChallenged();
    error AlreadyChallenged();
    error ChallengeExpired();
    error ChallengePending();
    error NotChallenger();
    error StakeLocked();
    error InvalidExtension();

    /**
     * @dev Internal function to transfer ETH to an address
     * @param recipient The address receiving the ETH
     * @param amount The amount of ETH to transfer
     */
    function _transferFunds(address recipient, uint256 amount) internal {
        (bool sent, ) = recipient.call{value: amount}("");
        require(sent, "Failed to transfer funds");
    }

    /**
     * @notice Allows a user to stake ETH and register their PGP public key
     * @param publicKey The user's PGP public key
     */
    function stake(string calldata publicKey) external payable {
        if (msg.value < MINIMUM_STAKE) revert InsufficientStake();
        if (stakes[msg.sender].isStaked) revert AlreadyStaked();
        if (keyIDToStaker[publicKey] != address(0)) revert AlreadyStaked();

        stakes[msg.sender] = UserStake({
            publicKey: publicKey,
            stakedAmount: msg.value,
            challengeDeadline: 0,
            stakeTimestamp: block.timestamp,
            challenger: address(0),
            challengeFee: 0,
            isStaked: true
        });

        keyIDToStaker[publicKey] = msg.sender;
        emit Staked(msg.sender, publicKey, msg.value);
    }

    /**
     * @notice Allows a user to challenge another user's PGP identity
     * @param user The address of the user being challenged
     */
    function challenge(address user) external payable {
        if (msg.value != CHALLENGE_FEE) revert InsufficientChallengeFee();
        if (!stakes[user].isStaked) revert NoActiveStake();
        if (stakes[user].challenger != address(0)) revert AlreadyChallenged();

        stakes[user].challenger = msg.sender;
        stakes[user].challengeDeadline = block.timestamp + CHALLENGE_DURATION;
        stakes[user].challengeFee = CHALLENGE_FEE;

        emit Challenged(user, msg.sender);
    }

    /**
     * @notice Allows a challenged user to prove their PGP identity
     * @dev This function will be implemented later with actual PGP verification
     * @param proof The proof data that will be used to verify the PGP identity
     * @return success Whether the proof was successful
     */
    function proveIdentity(string calldata proof) external returns (bool success) {
        UserStake storage userStake = stakes[msg.sender];
        if (!userStake.isStaked) revert NoActiveStake();
        if (userStake.challenger == address(0)) revert NotChallenged();
        if (block.timestamp > userStake.challengeDeadline) revert ChallengeExpired();

        success = verifyPGPProof(proof);

        address challenger = userStake.challenger;
        uint256 challengeFee = userStake.challengeFee;
        
        if (success) {
            // If proof is successful, transfer challenge fee to the proven user
            _transferFunds(msg.sender, challengeFee);
        } else {
            // If proof fails, return challenge fee along with the stake to challenger
            uint256 totalAmount = userStake.stakedAmount + challengeFee;
            string memory publicKey = userStake.publicKey;
            _transferFunds(challenger, totalAmount);
            delete stakes[msg.sender];
            delete keyIDToStaker[publicKey];
        }

        // Reset challenge state
        userStake.challenger = address(0);
        userStake.challengeDeadline = 0;
        userStake.challengeFee = 0;

        emit ChallengeResolved(msg.sender, challenger, success);
        return success;
    }

    /**
     * @notice Allows a challenger to claim the stake if the challenge deadline has passed
     * @param user The address of the challenged user
     */
    function claimStake(address user) external {
        UserStake storage userStake = stakes[user];
        if (!userStake.isStaked) revert NoActiveStake();
        if (msg.sender != userStake.challenger) revert NotChallenger();
        if (block.timestamp <= userStake.challengeDeadline) revert ChallengePending();

        uint256 totalAmount = userStake.stakedAmount + userStake.challengeFee;
        string memory publicKey = userStake.publicKey;
        delete stakes[user];
        delete keyIDToStaker[publicKey];
        _transferFunds(msg.sender, totalAmount);
        emit ChallengeResolved(user, msg.sender, false);
    }

    /**
     * @notice Allows a user to withdraw their stake if they're not being challenged and minimum duration has passed
     */
    function withdrawStake() external {
        UserStake storage userStake = stakes[msg.sender];
        if (!userStake.isStaked) revert NoActiveStake();
        if (userStake.challenger != address(0)) revert ChallengePending();
        if (block.timestamp < userStake.stakeTimestamp + MINIMUM_STAKE_DURATION) revert StakeLocked();

        uint256 amount = userStake.stakedAmount;
        string memory publicKey = userStake.publicKey;
        delete stakes[msg.sender];
        delete keyIDToStaker[publicKey];

        _transferFunds(msg.sender, amount);
        emit StakeWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Allows a user to extend their stake's lock period
     * @param additionalTime The number of seconds to extend the lock by (must be at least MINIMUM_STAKE_DURATION)
     */
    function extendLock(uint256 additionalTime) external {
        UserStake storage userStake = stakes[msg.sender];
        if (!userStake.isStaked) revert NoActiveStake();
        if (additionalTime < MINIMUM_STAKE_DURATION) revert InvalidExtension();

        uint256 currentUnlockTime = userStake.stakeTimestamp + MINIMUM_STAKE_DURATION;
        uint256 newUnlockTime;
        
        // If the stake is already unlocked, extend from current time
        if (block.timestamp >= currentUnlockTime) {
            newUnlockTime = block.timestamp + additionalTime;
            userStake.stakeTimestamp = newUnlockTime - MINIMUM_STAKE_DURATION;
        } else {
            // If still locked, extend from current unlock time
            newUnlockTime = currentUnlockTime + additionalTime;
            userStake.stakeTimestamp = newUnlockTime - MINIMUM_STAKE_DURATION;
        }

        emit LockExtended(msg.sender, newUnlockTime);
    }

    /**
     * @notice Returns the remaining lock time for a stake in seconds
     * @param user The address of the staked user
     * @return remainingTime Time remaining until stake can be withdrawn (0 if withdrawable or no stake)
     */
    function getRemainingLockTime(address user) external view returns (uint256 remainingTime) {
        UserStake storage userStake = stakes[user];
        if (!userStake.isStaked) return 0;
        
        uint256 unlockTime = userStake.stakeTimestamp + MINIMUM_STAKE_DURATION;
        if (block.timestamp >= unlockTime) return 0;
        
        return unlockTime - block.timestamp;
    }

    /**
     * @dev Verifies a zero-knowledge proof of passport ownership
     * @param proof The VcAndDiscloseHubProof containing the proof data
     * @return valid Whether the proof is valid
     */
    function verifyPGPProof(string calldata proof) internal view returns (bool) {
        // TODO: Implement PGP proof verification
        return true;
    }
}
