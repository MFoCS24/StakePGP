"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ManagePGP } from "./components/pgp/ManagePGP";
import { SearchPGP } from "./components/search/SearchPGP";
import { ManageStake } from "./components/stake/ManageStake";
import { PGPIdentity, StakeContract } from "./types/pgp";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { HomeIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<"pgp" | "stake" | "search">("pgp");
  const [pgpIdentity, setPgpIdentity] = useState<PGPIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stakeContract, setStakeContract] = useState<StakeContract | null>(null);

  const { data: stakePGPContract, isLoading: isContractLoading } = useScaffoldContract({
    contractName: "StakePGP",
  });

  // Fetch PGP identity
  useEffect(() => {
    const fetchPGPIdentity = async () => {
      if (!connectedAddress) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const storedIdentity = localStorage.getItem("pgp_identity");
        const identity = storedIdentity ? JSON.parse(storedIdentity) : null;
        setPgpIdentity(identity);
      } catch (error) {
        console.error("Error fetching PGP identity:", error);
        setPgpIdentity(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPGPIdentity();
  }, [connectedAddress]);

  // Fetch stake data
  useEffect(() => {
    const fetchStakeData = async () => {
      if (!stakePGPContract || !connectedAddress || !pgpIdentity) {
        setStakeContract(null);
        return;
      }

      try {
        const data = await stakePGPContract.read.stakes([connectedAddress]);
        // data is returned as a tuple: [publicKey, stakedAmount, challengeDeadline, stakeTimestamp, challenger, challengeFee, isStaked]
        const [_, stakedAmount, challengeDeadline, stakeTimestamp, challenger, , isStaked] = data;

        if (isStaked) {
          setStakeContract({
            amount: formatEther(stakedAmount),
            startDate: new Date(Number(stakeTimestamp) * 1000),
            isBeingChallenged: challenger !== "0x0000000000000000000000000000000000000000",
            lastChallengeDate: challengeDeadline > 0n 
              ? new Date(Number(challengeDeadline) * 1000)
              : undefined,
          });
        } else {
          setStakeContract(null);
        }
      } catch (error) {
        console.error("Error fetching stake data:", error);
        setStakeContract(null);
      }
    };

    fetchStakeData();
  }, [stakePGPContract, connectedAddress, pgpIdentity]);

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
        <ManagePGP 
          pgpIdentity={pgpIdentity} 
          isLoadingIdentity={isLoading} 
          setPgpIdentity={setPgpIdentity} 
        />
      )}
      {activeTab === "stake" && (
        <ManageStake
          pgpIdentity={pgpIdentity}
          isLoadingIdentity={isLoading || isContractLoading}
          stakeContract={stakeContract}
          isLoadingContract={isContractLoading}
          setActiveTab={setActiveTab}
        />
      )}
      {activeTab === "search" && <SearchPGP />}
    </div>
  );
};

export default Home;
