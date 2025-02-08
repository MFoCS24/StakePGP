"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ManagePGP } from "./components/pgp/ManagePGP";
import { SearchPGP } from "./components/search/SearchPGP";
import { ManageStake } from "./components/stake/ManageStake";
import { PGPIdentity, StakeContract } from "./types/pgp";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { HomeIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<"pgp" | "stake" | "search">("pgp");
  const [pgpIdentity, setPgpIdentity] = useState<PGPIdentity | null>(null);
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(true);
  const [stakeContract, setStakeContract] = useState<StakeContract | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(true);

  // Fetch PGP identity
  useEffect(() => {
    const fetchPGPIdentity = async () => {
      try {
        setIsLoadingIdentity(true);
        // Check localStorage first
        const storedIdentity = localStorage.getItem("pgp_identity");
        if (storedIdentity) {
          setPgpIdentity(JSON.parse(storedIdentity));
        }
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
              <button className={`tab ${activeTab === "pgp" ? "tab-active" : ""}`} onClick={() => setActiveTab("pgp")}>
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
            <Link href="/debug" className="btn btn-sm btn-ghost gap-2">
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

      {activeTab === "pgp" && (
        <ManagePGP pgpIdentity={pgpIdentity} isLoadingIdentity={isLoadingIdentity} setPgpIdentity={setPgpIdentity} />
      )}
      {activeTab === "stake" && (
        <ManageStake
          pgpIdentity={pgpIdentity}
          isLoadingIdentity={isLoadingIdentity}
          stakeContract={stakeContract}
          isLoadingContract={isLoadingContract}
          setActiveTab={setActiveTab}
        />
      )}
      {activeTab === "search" && <SearchPGP />}
    </div>
  );
};

export default Home;
