//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

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
contract StakePGP {
    // State variables
    struct UserStake {
        bytes publicKey;      // PGP public key
        uint256 stakedAmount; // Amount of ETH staked
        uint256 challengeDeadline; // Deadline for responding to challenge
        address challenger;    // Address of the current challenger
        bool isStaked;        // Whether this address has an active stake
    }

    mapping(address => UserStake) public stakes;
    uint256 public constant CHALLENGE_DURATION = 3 days;
    uint256 public constant MINIMUM_STAKE = 0.1 ether;
    uint256 public constant CHALLENGE_FEE = 0.05 ether;

    // Events
    event Staked(address indexed user, bytes publicKey, uint256 amount);
    event Challenged(address indexed user, address indexed challenger);
    event ChallengeResolved(address indexed user, address indexed challenger, bool success);
    event StakeWithdrawn(address indexed user, uint256 amount);

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

    /**
     * @notice Allows a user to stake ETH and register their PGP public key
     * @param publicKey The user's PGP public key
     */
    function stake(bytes calldata publicKey) external payable {
        if (msg.value < MINIMUM_STAKE) revert InsufficientStake();
        if (stakes[msg.sender].isStaked) revert AlreadyStaked();

        stakes[msg.sender] = UserStake({
            publicKey: publicKey,
            stakedAmount: msg.value,
            challengeDeadline: 0,
            challenger: address(0),
            isStaked: true
        });

        emit Staked(msg.sender, publicKey, msg.value);
    }

    /**
     * @notice Allows a user to challenge another user's PGP identity
     * @param user The address of the user being challenged
     */
    function challenge(address user) external payable {
        if (msg.value < CHALLENGE_FEE) revert InsufficientChallengeFee();
        if (!stakes[user].isStaked) revert NoActiveStake();
        if (stakes[user].challenger != address(0)) revert AlreadyChallenged();

        stakes[user].challenger = msg.sender;
        stakes[user].challengeDeadline = block.timestamp + CHALLENGE_DURATION;

        emit Challenged(user, msg.sender);
    }

    /**
     * @notice Allows a challenged user to prove their PGP identity
     * @dev This function will be implemented later with actual PGP verification
     * @param proof The proof data that will be used to verify the PGP identity
     * @return success Whether the proof was successful
     */
    function proveIdentity(bytes calldata proof) external returns (bool success) {
        UserStake storage userStake = stakes[msg.sender];
        if (!userStake.isStaked) revert NoActiveStake();
        if (userStake.challenger == address(0)) revert NotChallenged();
        if (block.timestamp > userStake.challengeDeadline) revert ChallengeExpired();

        // TODO: Implement PGP verification logic here
        // This will return true if the proof is valid, false otherwise
        success = verifyPGPProof(userStake.publicKey, proof);

        address challenger = userStake.challenger;
        
        if (success) {
            // If proof is successful, transfer challenge fee to the proven user
            (bool sent, ) = msg.sender.call{value: CHALLENGE_FEE}("");
            require(sent, "Failed to send challenge fee");
        } else {
            // If proof fails, transfer stake to challenger
            uint256 amount = userStake.stakedAmount;
            delete stakes[msg.sender];
            
            (bool sent, ) = challenger.call{value: amount}("");
            require(sent, "Failed to send stake");
        }

        // Reset challenge state
        userStake.challenger = address(0);
        userStake.challengeDeadline = 0;

        emit ChallengeResolved(msg.sender, challenger, success);
        return success;
    }

    /**
     * @dev Internal function to verify PGP proof
     * @param publicKey The user's PGP public key
     * @param proof The proof data
     * @return valid Whether the proof is valid
     */
    function verifyPGPProof(bytes memory publicKey, bytes memory proof) internal pure returns (bool valid) {
        // TODO: Implement actual PGP verification logic
        // For now, return true to indicate unimplemented
        return true;
    }

    /**
     * @notice Allows a user to withdraw their stake if they're not being challenged
     */
    function withdrawStake() external {
        UserStake storage userStake = stakes[msg.sender];
        if (!userStake.isStaked) revert NoActiveStake();
        if (userStake.challenger != address(0)) revert ChallengePending();

        uint256 amount = userStake.stakedAmount;
        delete stakes[msg.sender];

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send stake");

        emit StakeWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Returns the stake information for a given user
     * @param user The address of the user
     * @return The UserStake struct containing the user's stake information
     */
    function getStake(address user) external view returns (UserStake memory) {
        return stakes[user];
    }
}
