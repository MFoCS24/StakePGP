"use client";

import { ExclamationTriangleIcon, KeyIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
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
const openPassportVerifier: OpenPassportVerifier = new OpenPassportVerifier('prove_onchain', scope).setMinimumAge(18).allowMockPassports();;


export const ManageStake = ({
  pgpIdentity,
  isLoadingIdentity,
  stakeContract,
  isLoadingContract,
  setActiveTab,
}: ManageStakeProps) => {
  const [stakeAmount, setStakeAmount] = useState<string>("100000000000000000"); // Default 0.1 ETH
  const [isStaking, setIsStaking] = useState(false);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const { data: stakePGPContract } = useScaffoldContract({
    contractName: "StakePGP",
    walletClient,
  });

  const handleStake = async () => {
    if (!stakePGPContract || !pgpIdentity?.publicKey || !publicClient) {
      notification.error("Contract, PGP key, or network not available");
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

  if (isLoadingIdentity || isLoadingContract) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
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
          <div className="flex flex-col gap-4 mt-4">
            <button className="btn btn-secondary">Verify Now</button>
              <OpenPassportQRcode
                appName="StakePGP"
                userId={uuidv4()}
                userIdType={'uuid'}
                openPassportVerifier={openPassportVerifier}
                onSuccess={(attestation) => {
                // send the code to the backend server
                }}
              />
          </div>
        </div>
      </div>
    </>
  );
}; 