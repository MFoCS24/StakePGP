"use client";

import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";

const ManagePGP: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <div className="flex flex-col gap-6 py-8 px-4 lg:px-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Manage PGP Keys</h1>
        <div className="flex items-center gap-2">
          <p className="my-2 font-medium">Connected Address:</p>
          <Address address={connectedAddress} />
        </div>
      </div>

      {/* Key Management Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Import/Generate Key</h2>
            <p>Import your existing PGP key or generate a new one</p>
            {/* Add key import/generation form here */}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Sign Keys</h2>
            <p>Sign other users' public keys to verify their identity</p>
            {/* Add key signing interface here */}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Upload Signatures</h2>
            <p>Upload your signatures to the Ubuntu keyserver</p>
            {/* Add signature upload interface here */}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Key Management</h2>
            <p>Manage your existing PGP keys and signatures</p>
            {/* Add key management interface here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagePGP; 