"use client";

import { ExclamationTriangleIcon, KeyIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { PGPIdentity, StakeContract } from "../../types/pgp";

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
  isLoadingContract,
  setActiveTab,
}: ManageStakeProps) => {
  if (isLoadingIdentity) {
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

      {isLoadingContract ? (
        <div className="flex justify-center items-center h-40">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : !stakeContract ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Create Stake Contract</h2>
            <p>No stake contract found for your PGP identity. Create one to start participating.</p>
            <div className="card-actions justify-end mt-4">
              <button className="btn btn-primary">Sign Staking Contract</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
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

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Contract Actions</h2>
              <div className="flex flex-col gap-4 mt-4">
                <button className="btn btn-primary">Increase Stake</button>
                <button className="btn btn-error">Withdraw Stake</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 