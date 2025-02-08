"use client";

import { useState } from "react";
import { KeyIcon } from "@heroicons/react/24/outline";

export const SearchPGP = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <div className="form-control mb-6">
        <div className="input-group">
          <input
            type="text"
            placeholder="Search by key ID, email, or name..."
            className="input input-bordered flex-1"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
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