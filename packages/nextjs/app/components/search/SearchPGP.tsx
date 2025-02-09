"use client";

import { useState } from "react";
import * as openpgp from "openpgp";
import { KeyIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

export const SearchPGP = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<PGPIdentity | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  interface PGPIdentity {
    keyId: string;
    userInfo: string;
    signatures: number;
    hasStake: boolean;
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

      // TODO: Replace with actual contract call to check stake status
      const hasStake = false;

      // Count self-certifications (signatures) on the key
      const signatures = publicKeyObj.users[0].otherCertifications?.length || 0;

      setSearchResult({
        keyId: fullKeyId,
        userInfo: `${name.trim()} <${email.trim()}>`,
        signatures,
        hasStake,
      });
    } catch (error) {
      console.error("Error searching for key:", error);
      setError(error instanceof Error ? error.message : "Failed to find PGP identity");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      <div className="form-control mb-6">
        <div className="input-group">
          <input
            type="text"
            placeholder="Search by key ID"
            className="input input-bordered flex-1"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyPress={e => e.key === "Enter" && handleSearch()}
          />
          <button className="btn btn-square" onClick={handleSearch}>
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
                    <td>-</td>
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
    </>
  );
};
