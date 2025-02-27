"use client";

import { useState } from "react";
import * as openpgp from "openpgp";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { usePublicClient, useWalletClient } from "wagmi";
import { parseEther } from "viem";


export const SearchPGP = () => {
  const { data: walletClient } = useWalletClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<PGPIdentity | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const publicClient = usePublicClient();

  const { data: stakePGPContract, isLoading: isLoadingContract } = useScaffoldContract({
    contractName: "StakePGP",
    walletClient,
  });

  interface PGPIdentity {
    keyId: string;
    userInfo: string;
    signatures: number;
    hasStake: boolean;
    stakerAddress?: string;
    isChallengable: boolean;
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError("");
    setSearchResult(null);

    try {
      // Fetch the public key from Ubuntu keyserver
      const response = await fetch(
        `https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x${searchQuery.replace(/\s+/g, "")}&options=mr&fingerprint=on`,
        {
          headers: {
            Accept: "application/pgp-keys",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Key not found on keyserver");
      }

      const publicKey = await response.text();

      // Read and validate the public key
      const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });

      // Extract user information
      const userID = publicKeyObj.users[0]?.userID;
      if (!userID) {
        throw new Error("No user information found in the key");
      }

      // Parse user ID (format: "Name <email@example.com>")
      const nameMatch = userID.userID.match(/(.*?)\s*<(.+?)>/);
      if (!nameMatch) {
        throw new Error("Invalid user ID format in key");
      }

      const [, name, email] = nameMatch;
      const fullKeyId = publicKeyObj.getFingerprint().toUpperCase();

      // Check if this key has a stake
      let hasStake = false;
      let stakerAddress: string | undefined;
      let isChallengable = false;
      try {
        console.log("publicKey", publicKey);
        // Find the address that staked this key
        const fetchedStakerAddress = await stakePGPContract?.read.keyIDToStaker([fullKeyId]);
        console.log("stakerAddress", fetchedStakerAddress);
        if (fetchedStakerAddress != undefined && fetchedStakerAddress !== "0x0000000000000000000000000000000000000000") {
          // Key has a stake, verify it's active
          console.log("stakePGPContract", stakePGPContract);
          const stakeData = await stakePGPContract?.read.stakes([fetchedStakerAddress]);
          hasStake = stakeData != undefined ? stakeData[6] : false;
          if (hasStake) {
            // Store the staker address if stake is active
            stakerAddress = fetchedStakerAddress;
            isChallengable = stakeData != undefined && stakeData[4] === "0x0000000000000000000000000000000000000000";
          }
        }
        console.log("hasStake", hasStake);
      } catch (error) {
        console.error("Error checking stake:", error);
        notification.error("Error checking stake");
        hasStake = false;
      }

      // Count self-certifications (signatures) on the key
      const signatures = publicKeyObj.users[0].otherCertifications?.length || 0;

      setSearchResult({
        keyId: fullKeyId,
        userInfo: `${name.trim()} <${email.trim()}>`,
        signatures,
        hasStake,
        stakerAddress,
        isChallengable,
      });
    } catch (error) {
      console.error("Error searching for key:", error);
      setError(error instanceof Error ? error.message : "Failed to find PGP identity");
    } finally {
      setIsSearching(false);
    }
  };

  const handleChallenge = async () => {
    if (!stakePGPContract) {
      notification.error("Contract connection not available. Please refresh the page.");
      return;
    }
    if (!searchResult?.keyId) {
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

    try {
      setIsStaking(true);
      if (!searchResult?.stakerAddress) {
        notification.error("No staker address found");
        return;
      }
      const hash = await stakePGPContract.write.challenge(
        [searchResult.stakerAddress],
        { value: parseEther("0.05") }
      );
      notification.success("Challenge transaction sent!");
      console.log("Transaction hash:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      notification.success("Successfully challenged the stake!");
      
      // Close the modal and refresh the search
      (document.getElementById('challenge-modal') as HTMLDialogElement).close();
      handleSearch();
    } catch (error: any) {
      if (error.message.includes("doesn't have enough funds")) {
        notification.error("You don't have enough funds to challenge. Please deposit more ETH to your wallet.");
      } else {
        console.error("Error challenging stake:", error);
        notification.error(error.message || "Error while challenging stake");
      }
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <>
      <div className="form-control mb-6">
        <div className="input-group">
          <input
            type="text"
            placeholder="Search by key ID"
            className="input input-bordered w-full max-w-xl flex-1" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyPress={e => e.key === "Enter" && handleSearch()}
          />
          <button className="btn btn-square" onClick={handleSearch}>
            <MagnifyingGlassIcon  className="h-6 w-6 text-primary" />
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
                {isSearching ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      Searching...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="text-center text-error">
                      {error}
                    </td>
                  </tr>
                ) : !searchQuery ? (
                  <tr className="opacity-50">
                    <td colSpan={5} className="text-center">
                      Enter a search query to find PGP keys
                    </td>
                  </tr>
                ) : searchResult ? (
                  <tr>
                    <td className="whitespace-pre-wrap break-all">{searchResult.keyId}</td>
                    <td>{searchResult.userInfo}</td>
                    <td>{searchResult.signatures}</td>
                    <td>
                      {searchResult.hasStake ? (
                        <CheckCircleIcon className="h-6 w-6 text-success" />
                      ) : (
                        <XCircleIcon className="h-6 w-6 text-error" />
                      )}
                    </td>
                    <td>
                      {searchResult.hasStake && (
                        <button 
                          className="btn btn-sm btn-error"
                          disabled={!searchResult.isChallengable}
                          onClick={(e) => {
                            e.preventDefault();
                            (document.getElementById('challenge-modal') as HTMLDialogElement).showModal();
                          }}
                        >
                          Challenge
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center">
                      No results found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Challenge Modal */}
      <dialog id="challenge-modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Challenge Stake</h3>
          <div className="py-4">
            <p className="mb-4">Are you sure you want to challenge this stake?</p>
            <p className="mb-2"><strong>Staker Address:</strong></p>
            <p className="mb-4 break-all">{searchResult?.stakerAddress}</p>
            <p className="mb-2"><strong>Required Challenge Amount:</strong></p>
            <p>0.05 ETH</p>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost mr-2">Cancel</button>
              <button 
                className="btn btn-error" 
                onClick={(e) => {
                  e.preventDefault();
                  handleChallenge();
                }}
                disabled={isStaking}
              >
                {isStaking ? "Challenging..." : "Challenge Stake"}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
};
