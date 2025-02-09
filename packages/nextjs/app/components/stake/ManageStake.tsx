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
}

export const ManageStake = ({
  pgpIdentity,
  isLoadingIdentity,
  stakeContract,
  isLoadingContract: isLoadingStakeContract,
  setActiveTab,
}: ManageStakeProps) => {
  const [stakeAmount, setStakeAmount] = useState<string>("100000000000000000"); // Default 0.1 ETH
  const [isStaking, setIsStaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
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

    try {
      setIsStaking(true);
      const hash = await stakePGPContract.write.stake(
        [pgpIdentity.publicKey],
        { value: BigInt(stakeAmount) }
      );
      notification.success("Transaction sent!");
      
      await publicClient.waitForTransactionReceipt({ hash });
      notification.success("Successfully staked!");
    } catch (error: any) {
      console.error("Error staking:", error);
      notification.error(error.message || "Error while staking");
    } finally {
      setIsStaking(false);
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
      
      // Convert the proof to a string format as expected by the contract
      const proofString = JSON.stringify({
        olderThanEnabled: true,
        olderThan: BigInt(18).toString(),
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: BigInt(0).toString(),
        ofacEnabled: true,
        vcAndDiscloseProof: {
          a: attestation.proof.a?.map((x: bigint) => x.toString()) || ["0", "0"],
          b: attestation.proof.b?.map((pair: bigint[]) => pair.map(x => x.toString())) || [["0", "0"], ["0", "0"]],
          c: attestation.proof.c?.map((x: bigint) => x.toString()) || ["0", "0"],
          pubSignals: attestation.proof.pubSignals?.map((x: bigint) => x.toString()) || []
        }
      });

      console.log("Proof string to send:", proofString);

      const hash = await stakePGPContract.write.proveIdentity(
        [proofString]
      );
      
      notification.success("Verification proof sent!");
      
      await publicClient.waitForTransactionReceipt({ hash });
      notification.success("Identity verified successfully on-chain!");
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
      <div className="alert alert-info">
        <KeyIcon className="h-6 w-6" />
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
            <h2 className="card-title">Create Stake Contract</h2>
            <p>No stake contract found for your PGP identity. Create one to start participating.</p>
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
                  className="btn btn-primary" 
                  onClick={handleStake}
                  disabled={isStaking || !stakeAmount || BigInt(stakeAmount) < parseEther("0.1")}
                >
                  {isStaking ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Staking...
                    </>
                  ) : (
                    "Sign Staking Contract"
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
                <ShieldCheckIcon className="h-6 w-6 text-success" />
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
                    <span className="text-success">Active</span>
                  )}
                </p>
                {stakeContract.lastChallengeDate && (
                  <p>Last Challenge: {stakeContract.lastChallengeDate.toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl mt-4">
            <div className="card-body">
              <div className="flex flex-col gap-4 mt-4">
                <button className="btn btn-primary">Increase Stake</button>
                <button className="btn btn-error">Withdraw Stake</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card bg-base-100 shadow-xl mt-4">
        <div className="card-body">
          <h2 className="card-title">Verify Identity</h2>
          {isVerifying && (
            <div className="alert alert-info">
              <span className="loading loading-spinner loading-sm"></span>
              <span>Verifying identity on-chain...</span>
            </div>
          )}
          <div className="flex flex-col gap-4 mt-4">
            <OpenPassportQRcode
              appName="StakePGP"
              userId={userId}
              userIdType="uuid"
              openPassportVerifier={openPassportVerifier}
              onSuccess={handleVerification}
              size={250}
            />
          </div>
        </div>
      </div>
    </>
  );
}; 