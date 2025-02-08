"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon, HomeIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { useOutsideClick } from "~~/hooks/scaffold-eth";

// Dynamically import RainbowKitCustomConnectButton with no SSR
const RainbowKitCustomConnectButton = dynamic(
  () => import("~~/components/scaffold-eth").then(mod => mod.RainbowKitCustomConnectButton),
  { ssr: false }
);

/**
 * Site header
 */
export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isLegacyPage = pathname?.startsWith("/debug");

  useOutsideClick(
    burgerMenuRef,
    useCallback(() => setIsDrawerOpen(false), []),
  );

  if (!isLegacyPage) {
    return null;
  }

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 flex-shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
      <div className="navbar-start w-auto lg:w-1/2">
        <div className="lg:hidden dropdown" ref={burgerMenuRef}>
          <label
            tabIndex={0}
            className={`ml-1 btn btn-ghost ${isDrawerOpen ? "hover:bg-secondary" : "hover:bg-transparent"}`}
            onClick={() => {
              setIsDrawerOpen(prevIsOpenState => !prevIsOpenState);
            }}
          >
            <Bars3Icon className="h-1/2" />
          </label>
          {isDrawerOpen && (
            <ul
              tabIndex={0}
              className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52"
              onClick={() => {
                setIsDrawerOpen(false);
              }}
            >
              <li>
                <Link
                  href="/"
                  className="hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col"
                >
                  <HomeIcon className="h-4 w-4" />
                  <span>Main Version</span>
                </Link>
              </li>
            </ul>
          )}
        </div>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <li>
            <Link
              href="/"
              className="hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col"
            >
              <HomeIcon className="h-4 w-4" />
              <span>Main Version</span>
            </Link>
          </li>
        </ul>
      </div>
      <div className="navbar-end flex-grow mr-4">
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
