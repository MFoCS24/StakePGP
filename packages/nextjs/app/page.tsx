"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { KeyIcon, ArrowUpTrayIcon, DocumentDuplicateIcon, ExclamationTriangleIcon, ShieldCheckIcon, HomeIcon } from "@heroicons/react/24/outline";

interface PGPIdentity {
  keyId: string;
  name: string;
  email: string;
  publicKey: string;
}

interface StakeContract {
  amount: string;
  startDate: Date;
  isBeingChallenged: boolean;
  lastChallengeDate?: Date;
}

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<"pgp" | "stake" | "search">("pgp");
  const [pgpIdentity, setPgpIdentity] = useState<PGPIdentity | null>(null);
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(true);
  const [stakeContract, setStakeContract] = useState<StakeContract | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(true);
  const [importKey, setImportKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch PGP identity
  useEffect(() => {
    const fetchPGPIdentity = async () => {
      try {
        setIsLoadingIdentity(true);
        // TODO: Implement actual PGP identity fetch
        // For now, using mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        setPgpIdentity(null);
      } catch (error) {
        console.error("Error fetching PGP identity:", error);
        setPgpIdentity(null);
      } finally {
        setIsLoadingIdentity(false);
      }
    };

    if (connectedAddress) {
      fetchPGPIdentity();
    }
  }, [connectedAddress]);

  // Fetch stake contract if PGP identity exists
  useEffect(() => {
    const fetchStakeContract = async () => {
      if (!pgpIdentity) return;

      try {
        setIsLoadingContract(true);
        // TODO: Implement actual contract fetch
        // For now, using mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStakeContract(null);
      } catch (error) {
        console.error("Error fetching stake contract:", error);
        setStakeContract(null);
      } finally {
        setIsLoadingContract(false);
      }
    };

    fetchStakeContract();
  }, [pgpIdentity]);

  const handleImportKey = async () => {
    try {
      // TODO: Implement actual key import logic
      console.log("Importing key:", importKey);
    } catch (error) {
      console.error("Error importing key:", error);
    }
  };

  const handleGenerateKey = async () => {
    try {
      // TODO: Implement key generation logic
      console.log("Generating new key");
    } catch (error) {
      console.error("Error generating key:", error);
    }
  };

  const renderPGPManagement = () => {
    if (isLoadingIdentity) {
      return (
        <div className="flex justify-center items-center min-h-[60vh]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      );
    }

    return !pgpIdentity ? (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <ArrowUpTrayIcon className="h-6 w-6" />
              <h2 className="card-title">Import Existing Key</h2>
            </div>
            <div className="form-control mt-4">
              <textarea
                className="textarea textarea-bordered h-32"
                placeholder="Paste your PGP public key here..."
                value={importKey}
                onChange={(e) => setImportKey(e.target.value)}
              ></textarea>
            </div>
            <div className="card-actions justify-end mt-4">
              <button 
                className="btn btn-primary" 
                onClick={handleImportKey}
                disabled={!importKey.trim()}
              >
                Import Key
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <KeyIcon className="h-6 w-6" />
              <h2 className="card-title">Generate New Key</h2>
            </div>
            <p className="mt-4">Generate a new PGP key pair associated with your Ethereum address.</p>
            <div className="card-actions justify-end mt-4">
              <button 
                className="btn btn-secondary" 
                onClick={handleGenerateKey}
              >
                Generate Key
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <KeyIcon className="h-6 w-6 text-success" />
              <h2 className="card-title">Connected PGP Identity</h2>
            </div>
            <div className="mt-4">
              <p><strong>Key ID:</strong> {pgpIdentity.keyId}</p>
              <p><strong>Name:</strong> {pgpIdentity.name}</p>
              <p><strong>Email:</strong> {pgpIdentity.email}</p>
            </div>
            <div className="card-actions justify-end mt-4">
              <button 
                className="btn btn-sm btn-ghost gap-2"
                onClick={() => navigator.clipboard.writeText(pgpIdentity.publicKey)}
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                Copy Public Key
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Key Actions</h2>
            <div className="flex flex-col gap-4 mt-4">
              <button className="btn btn-primary">
                Upload to Keyserver
              </button>
              <button className="btn btn-error">
                Revoke Key
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStakeManagement = () => {
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
              Key ID: {pgpIdentity.keyId}<br />
              Name: {pgpIdentity.name}<br />
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
                <button className="btn btn-primary">
                  Sign Staking Contract
                </button>
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
                  <p>Status: {stakeContract.isBeingChallenged ? 
                    <span className="text-error">Being Challenged</span> : 
                    <span className="text-success">Active</span>
                  }</p>
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
                  <button className="btn btn-primary">
                    Increase Stake
                  </button>
                  <button className="btn btn-error">
                    Withdraw Stake
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderSearch = () => {
    return (
      <>
        <div className="form-control mb-6">
          <div className="input-group">
            <input
              type="text"
              placeholder="Search by key ID, email, or name..."
              className="input input-bordered flex-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn btn-square">
              <KeyIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Search Results</h2>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Key ID</th>
                    <th>User Info</th>
                    <th>Signatures</th>
                    <th>Stake Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="opacity-50">
                    <td colSpan={5} className="text-center">
                      Enter a search query to find PGP keys
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-6 py-8 px-4 lg:px-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">
            {activeTab === "pgp" && "Manage PGP Keys"}
            {activeTab === "stake" && "Manage Stake"}
            {activeTab === "search" && "Search PGP Keys"}
          </h1>
          <div className="flex items-center gap-4">
            <div className="tabs tabs-boxed">
              <button 
                className={`tab ${activeTab === "pgp" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("pgp")}
              >
                Manage PGP
              </button>
              <button 
                className={`tab ${activeTab === "stake" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("stake")}
              >
                Manage Stake
              </button>
              <button 
                className={`tab ${activeTab === "search" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("search")}
              >
                Search
              </button>
            </div>
            <Link
              href="/debug"
              className="btn btn-sm btn-ghost gap-2"
            >
              <HomeIcon className="h-4 w-4" />
              Legacy Version
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="my-2 font-medium">Connected Address:</p>
          <Address address={connectedAddress} />
        </div>
      </div>

      {activeTab === "pgp" && renderPGPManagement()}
      {activeTab === "stake" && renderStakeManagement()}
      {activeTab === "search" && renderSearch()}
    </div>
  );
};

export default Home;
