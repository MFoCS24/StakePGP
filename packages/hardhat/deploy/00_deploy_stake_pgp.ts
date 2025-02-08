import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { ethers } from "ethers";

/**
 * Deploys the StakePGP contract using the deployer account
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployStakePGP: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` or `yarn account:import` to import your
    existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("StakePGP", {
    from: deployer,
    // Contract has no constructor arguments
    args: [],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract
  const stakePGP = await hre.ethers.getContract<Contract>("StakePGP", deployer);
  console.log("📜 StakePGP deployed to:", stakePGP.address);

  // Log the minimum stake and challenge fee for verification
  const minStake = await stakePGP.MINIMUM_STAKE();
  const challengeFee = await stakePGP.CHALLENGE_FEE();
  console.log("💰 Minimum stake:", ethers.formatEther(minStake), "ETH");
  console.log("💸 Challenge fee:", ethers.formatEther(challengeFee), "ETH");
};

export default deployStakePGP;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags StakePGP
deployStakePGP.tags = ["StakePGP"];
