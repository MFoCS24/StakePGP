"use client";

import { ExclamationTriangleIcon, KeyIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { parseEther } from "viem";
import { v4 as uuidv4 } from 'uuid';
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { PGPIdentity, StakeContract } from "../../types/pgp";
import { IntegerInput } from "~~/components/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { useWalletClient, usePublicClient } from "wagmi";
import { OpenPassportVerifier } from '@openpassport/core';
import { OpenPassportQRcode } from '@openpassport/qrcode';

const scope = "stakePGP";
const userId = uuidv4();
// Create verifier with required settings
const openPassportVerifier = new OpenPassportVerifier('prove_offchain', scope)
  .setMinimumAge(18)  // Set minimum age requirement
  .enableOFACCheck()  // Enable OFAC compliance check
  .allowMockPassports()  // Allow mock passports for testing
  .setModalServerUrl('https://proofofpassport-merkle-tree.xyz');  // Set server URL

interface ManageStakeProps {
  pgpIdentity: PGPIdentity | null;
  isLoadingIdentity: boolean;
  stakeContract: StakeContract | null;
  isLoadingContract: boolean;
  setActiveTab: (tab: "pgp" | "stake" | "search") => void;
  onStakeSuccess?: () => void;
}

export const ManageStake = ({
  pgpIdentity,
  isLoadingIdentity,
  stakeContract,
  isLoadingContract: isLoadingStakeContract,
  setActiveTab,
  onStakeSuccess,
}: ManageStakeProps) => {
  const [stakeAmount, setStakeAmount] = useState<string>("100000000000000000"); // Default 0.1 ETH
  const [isStaking, setIsStaking] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [sessionId] = useState(uuidv4()); // Create a stable session ID
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const { data: stakePGPContract, isLoading: isLoadingContract } = useScaffoldContract({
    contractName: "StakePGP",
    walletClient,
  });

  // Add effect to check contract connection
  useEffect(() => {
    if (!stakePGPContract && !isLoadingContract) {
      console.log("Contract connection lost, attempting to reconnect...");
    }
  }, [stakePGPContract, isLoadingContract]);

  const handleStake = async () => {
    if (!stakePGPContract) {
      notification.error("Contract connection not available. Please refresh the page.");
      return;
    }
    if (!pgpIdentity?.publicKey) {
      notification.error("PGP key not available");
      return;
    }
    if (!publicClient) {
      notification.error("Network connection not available");
      return;
    }

    if (isStaking) {
      notification.error("Patience, you are already in the process!");
      return;
    }

    if (BigInt(stakeAmount) < parseEther("0.1")) {
      notification.error("Stake amount must be at least 0.1 ETH");
      return;
    }

    try {
      setIsStaking(true);
      const hash = await stakePGPContract.write.stake([pgpIdentity.keyId], { value: BigInt(stakeAmount) });
      notification.success("Transaction sent!");
      console.log("Transaction hash:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      notification.success("Successfully staked!");

      if (onStakeSuccess) {
        onStakeSuccess();
      }
    } catch (error: any) {
      if (error.message.includes("doesn't have enough funds")) {
        notification.error("You don't have enough funds to stake. Please deposit more ETH to your wallet.");
      } 
      else {
        console.error("Error staking:", error);
        notification.error(error.message || "Error while staking");
      }
    } finally {
      setIsStaking(false);
    }
  };

  const handleWithdraw = async () => {
    if (!stakePGPContract || !stakeContract || !publicClient) {
      notification.error("Contract not available");
      return;
    }

    if (isWithdrawing) {
      notification.error("Patience, withdrawal is in progress!");
      return;
    }

    try {
      setIsWithdrawing(true);
      const hash = await stakePGPContract.write.withdrawStake();
      notification.success("Withdrawal transaction sent!");
      console.log("Transaction hash:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      notification.success("Successfully withdrawn stake!");
      if (onStakeSuccess) {
        onStakeSuccess();
      }
    } catch (error: any) {
      console.error("Error withdrawing:", error);
      if (error.message.includes("StakeLocked()")) {
        notification.error("Your stake is still locked. You must wait at least 30 days after staking to withdraw.");
      } else {
        notification.error(error.message || "Error while withdrawing");
      }
    } finally {
      setIsWithdrawing(false);
    }
  };
  const handleVerification = async (attestation: any) => {
    if (!stakePGPContract) {
      notification.error("Contract connection lost. Please refresh the page and try again.");
      return;
    }

    if (!publicClient) {
      notification.error("Network connection not available. Please check your wallet connection.");
      return;
    }

    if (!walletClient) {
      notification.error("Wallet not connected. Please connect your wallet first.");
      return;
    }

    try {
      setIsVerifying(true);
      console.log("Contract status:", {
        contract: stakePGPContract,
        isLoading: isLoadingContract,
        publicClient,
        walletClient
      });
      console.log("Attestation received:", attestation);
      const hash = await stakePGPContract.write.proveIdentity(
        [attestation.proof?.value?.proof?.pi_a.slice(0, 2),
          attestation.proof?.value?.proof?.pi_b.slice(0, 2),
          attestation.proof?.value?.proof?.pi_c.slice(0, 2),
          attestation.proof?.value?.publicSignals.slice(0, 16)]
      );
      
      notification.success("Verification proof sent!");
      
      await publicClient.waitForTransactionReceipt({ hash });
      notification.success("Identity verified successfully on-chain!");
      setShowVerifyModal(false);
      
      if (onStakeSuccess) {
        onStakeSuccess();
      }
    } catch (error: any) {
      console.error("Error verifying identity:", error);
      notification.error(error.message || "Error during verification");
    } finally {
      setIsVerifying(false);
    }
  };

  // Show loading state while contract is initializing
  if (isLoadingContract || isLoadingIdentity) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Show error if contract is not available
  if (!stakePGPContract && !isLoadingContract) {
    return (
      <div className="alert alert-error">
        <ExclamationTriangleIcon className="h-6 w-6" />
        <div>
          <h3 className="font-bold">Contract Connection Error</h3>
          <p className="text-sm">Unable to connect to the smart contract. Please refresh the page or check your network connection.</p>
        </div>
        <button className="btn btn-sm" onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    );
  }

  if (!pgpIdentity) {
    return (
      <div className="alert alert-warning">
        <ExclamationTriangleIcon className="h-6 w-6" />
        <div>
          <h3 className="font-bold">No PGP Identity Connected</h3>
          <p className="text-sm">Please connect your PGP identity first before managing stakes.</p>
        </div>
        <button className="btn btn-sm" onClick={() => setActiveTab("pgp")}>
          Go to PGP Management
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="alert bg-secondary text-white">
        <KeyIcon className="h-6 w-6 text-primary" />
        <div>
          <h3 className="font-bold">Connected PGP Identity</h3>
          <p className="text-sm">
            Key ID: {pgpIdentity.keyId}
            <br />
            Name: {pgpIdentity.name}
            <br />
            Email: {pgpIdentity.email}
          </p>
        </div>
      </div>

      {!stakeContract ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Deposit your Stake</h2>
            <p>
              No stake contract found for your PGP identity. Create one to start participating in the StakePGP network.
            </p>
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Stake Amount (minimum 0.1 ETH)</label>
                <IntegerInput
                  value={stakeAmount}
                  onChange={value => setStakeAmount(value)}
                  placeholder="Amount in Wei"
                />
                <span className="text-xs text-gray-500">
                  Current amount: {stakeAmount ? parseFloat(stakeAmount) / 1e18 : 0} ETH
                </span>
              </div>
              <div className="card-actions justify-end">
                <button
                  className="btn btn-primary text-secondary"
                  onClick={handleStake}
                  disabled={isStaking || !stakeAmount || BigInt(stakeAmount) < parseEther("0.1")}
                >
                  {isStaking ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Staking...
                    </>
                  ) : (
                    "Sign Stake Contract"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="h-6 w-6 text-primary" />
                <h2 className="card-title">Active Stake Contract</h2>
              </div>
              <div className="flex flex-col gap-2 mt-4">
                <p>Amount Staked: {stakeContract.amount} ETH</p>
                <p>Start Date: {stakeContract.startDate.toLocaleDateString()}</p>
                <p>
                  Status:{" "}
                  {stakeContract.isBeingChallenged ? (
                    <span className="text-error">Being Challenged</span>
                  ) : (
                    <span className="text-success">Active, no Challenge</span>
                  )}
                </p>
                {stakeContract.lastChallengeDate && (
                  <p>Last Challenge: {stakeContract.lastChallengeDate.toLocaleDateString()}</p>
                )}
                <p>
                  Withdrawal Available: {new Date(stakeContract.startDate.getTime() + (30 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl mt-4">
            <div className="card-body">
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex gap-4">
                  <button 
                    className="btn btn-error flex-1" 
                    onClick={handleWithdraw}
                    disabled={isWithdrawing || stakeContract.isBeingChallenged}
                  >
                    {isWithdrawing ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Withdrawing...
                      </>
                    ) : (
                      "Withdraw Stake"
                    )}
                  </button>
                  <button 
                    className="btn btn-primary flex-1"
                    onClick={() => setShowVerifyModal(true)}
                    disabled={isVerifying || !stakeContract.isBeingChallenged}
                  >
                    {isVerifying ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Verifying...
                      </>
                    ) : (
                      "Verify Identity"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Verify Your Identity</h3>
            <p className="py-4">Scan this QR code with your OpenPassport app to verify your identity.</p>
            <div className="flex justify-center">
              <OpenPassportQRcode
                appName="StakePGP"
                userId={userId}
                userIdType="uuid"
                openPassportVerifier={openPassportVerifier}
                onSuccess={handleVerification}
                size={250}
              />
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setShowVerifyModal(false)}>Close</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowVerifyModal(false)}>
            <button className="cursor-default">Close</button>
          </div>
        </div>
      )}
    </>
  );
};
