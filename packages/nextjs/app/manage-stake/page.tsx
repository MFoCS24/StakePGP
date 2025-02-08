"use client";

import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";

const ManageStake: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <div className="flex flex-col gap-6 py-8 px-4 lg:px-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Manage Stake</h1>
        <div className="flex items-center gap-2">
          <p className="my-2 font-medium">Connected Address:</p>
          <Address address={connectedAddress} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Contract Status</h2>
            <div className="flex flex-col gap-2">
              <p>Current stake status and challenge information</p>
              {/* Add contract status display here */}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Sign Staking Contract</h2>
            <div className="flex flex-col gap-2">
              <p>Sign a new staking contract or modify existing stake</p>
              {/* Add staking contract interaction here */}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Challenge History</h2>
            <div className="flex flex-col gap-2">
              <p>View past challenges and their outcomes</p>
              {/* Add challenge history display here */}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Stake Analytics</h2>
            <div className="flex flex-col gap-2">
              <p>View detailed analytics about your stake</p>
              {/* Add stake analytics display here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageStake; 