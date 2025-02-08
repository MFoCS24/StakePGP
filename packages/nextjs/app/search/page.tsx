"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const Search: NextPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col gap-6 py-8 px-4 lg:px-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Search PGP Keys</h1>
        <p className="text-lg">Search for public keys and view their signatures and stake status</p>
      </div>

      {/* Search Input */}
      <div className="form-control">
        <div className="input-group">
          <input
            type="text"
            placeholder="Search by key ID, email, or name..."
            className="input input-bordered flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="btn btn-square">
            <MagnifyingGlassIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Search Results */}
      <div className="flex flex-col gap-4">
        {/* Results will be displayed here */}
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
                  {/* Search results will be mapped here */}
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
      </div>
    </div>
  );
};

export default Search; 