"use client";

import { useEffect, useState } from "react";
import { PGPIdentity } from "../../types/pgp";
import * as openpgp from "openpgp";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { notification } from "~~/utils/scaffold-eth";

interface ManagePGPProps {
  pgpIdentity: PGPIdentity | null;
  isLoadingIdentity: boolean;
  setPgpIdentity: (identity: PGPIdentity | null) => void;
}

export const ManagePGP = ({ pgpIdentity, isLoadingIdentity, setPgpIdentity }: ManagePGPProps) => {
  const [importKey, setImportKey] = useState("");
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [isUploadingKey, setIsUploadingKey] = useState(false);
  const [isImportingKey, setIsImportingKey] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [keyGenForm, setKeyGenForm] = useState({
    name: "",
    email: "",
    passphrase: "",
  });

  useEffect(() => {
    const storedIdentity = localStorage.getItem("pgp_identity");
    if (storedIdentity) {
      setPgpIdentity(JSON.parse(storedIdentity));
    }
  }, [setPgpIdentity]);

  const handleImportKey = async () => {
    try {
      setImportError(null);
      setIsImportingKey(true);

      // Fetch the public key from the keyserver
      const response = await fetch(
        `https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x${importKey.replace(/\s+/g, "")}&options=mr&fingerprint=on`,
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

      // Try to read and validate the public key
      const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });

      // Extract user information from the key
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

      // Create PGP identity object
      const newIdentity: PGPIdentity = {
        keyId: fullKeyId,
        name: name.trim(),
        email: email.trim(),
        publicKey,
      };

      setPgpIdentity(newIdentity);

      // Store in local storage
      localStorage.setItem("pgp_identity", JSON.stringify(newIdentity));
    } catch (error) {
      console.error("Error importing key:", error);
      setImportError(error instanceof Error ? error.message : "Invalid PGP key ID or key not found");
    } finally {
      setIsImportingKey(false);
    }
  };

  const handleGenerateKey = async () => {
    try {
      setIsGeneratingKey(true);

      // Generate key pair
      const { privateKey, publicKey } = await openpgp.generateKey({
        type: "rsa",
        rsaBits: 4096,
        userIDs: [{ name: keyGenForm.name, email: keyGenForm.email }],
        passphrase: keyGenForm.passphrase,
      });

      // Extract key ID from the public key
      const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });
      const fullKeyId = publicKeyObj.getFingerprint().toUpperCase();

      // Create PGP identity object
      const newIdentity: PGPIdentity = {
        keyId: fullKeyId,
        name: keyGenForm.name,
        email: keyGenForm.email,
        publicKey,
        privateKey,
      };

      setPgpIdentity(newIdentity);

      // Store in local storage
      localStorage.setItem("pgp_identity", JSON.stringify(newIdentity));
    } catch (error) {
      console.error("Error generating key:", error);
      alert("Failed to generate key. Please try again.");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleUploadToKeyserver = async () => {
    if (!pgpIdentity) return;

    try {
      setIsUploadingKey(true);

      // Upload to Ubuntu keyserver
      const response = await fetch("https://keyserver.ubuntu.com/pks/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `keytext=${encodeURIComponent(pgpIdentity.publicKey)}`,
      });

      if (!response.ok) {
        notification.error("Failed to upload key to keyserver");
      }

      notification.success("Key uploaded successfully!");
    } catch (error) {
      console.error("Error uploading key:", error);
      notification.error("Failed to upload key to keyserver. Please try again.");
    } finally {
      setIsUploadingKey(false);
    }
  };

  const handleDownloadPrivateKey = () => {
    if (!pgpIdentity?.privateKey) return;

    // Create a blob with the private key
    const blob = new Blob([pgpIdentity.privateKey], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);

    // Create a temporary link element and trigger the download
    const a = document.createElement("a");
    a.href = url;
    a.download = `pgp-private-key-${pgpIdentity.keyId.toLowerCase()}.asc`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleLogout = () => {
    // Clear PGP identity from state
    setPgpIdentity(null);
    // Remove from local storage
    localStorage.removeItem("pgp_identity");
  };

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
            <input
              type="text"
              className={`input input-bordered ${importError ? "input-error" : ""}`}
              placeholder="Enter your PGP key ID..."
              value={importKey}
              onChange={e => {
                setImportKey(e.target.value);
                setImportError(null);
              }}
            />
            {importError && (
              <div className="alert alert-error mt-2">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span className="text-sm">{importError}</span>
              </div>
            )}
            <label className="label">
              <span className="label-text-alt">Enter your PGP key ID (e.g., 0x1234ABCD or 1234ABCD)</span>
            </label>
          </div>
          <div className="card-actions justify-end mt-4">
            <button
              className={`btn btn-primary text-secondary ${isImportingKey ? "loading" : ""}`}
              onClick={handleImportKey}
              disabled={!importKey.trim() || isImportingKey}
            >
              {isImportingKey ? "Importing..." : "Import Key"}
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <KeyIcon className="h-6 w-6 text-primary" />
            <h2 className="card-title">Generate New Key</h2>
          </div>
          <div className="form-control gap-4 mt-4">
            <input
              type="text"
              placeholder="Full Name"
              className="input input-bordered"
              value={keyGenForm.name}
              onChange={e => setKeyGenForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <input
              type="email"
              placeholder="Email Address"
              className="input input-bordered"
              value={keyGenForm.email}
              onChange={e => setKeyGenForm(prev => ({ ...prev, email: e.target.value }))}
            />
            <input
              type="password"
              placeholder="Key Passphrase"
              className="input input-bordered"
              value={keyGenForm.passphrase}
              onChange={e => setKeyGenForm(prev => ({ ...prev, passphrase: e.target.value }))}
            />
          </div>
          <div className="card-actions justify-end mt-4">
            <button
              className={`btn btn-secondary ${isGeneratingKey ? "loading" : ""}`}
              onClick={handleGenerateKey}
              disabled={isGeneratingKey || !keyGenForm.name || !keyGenForm.email || !keyGenForm.passphrase}
            >
              {isGeneratingKey ? "Generating..." : "Generate Key"}
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
            <KeyIcon className="h-6 w-6 text-primary" />
            <h2 className="card-title">Connected PGP Identity</h2>
          </div>
          <div className="mt-4">
            <p className="break-all">
              <strong>Key ID:</strong> {pgpIdentity.keyId}
            </p>
            <p>
              <strong>Name:</strong> {pgpIdentity.name}
            </p>
            <p>
              <strong>Email:</strong> {pgpIdentity.email}
            </p>
          </div>
          <div className="card-actions justify-end mt-4 flex-wrap gap-2">
            <button
              className="btn btn-sm btn-ghost gap-2"
              onClick={() => navigator.clipboard.writeText(pgpIdentity.publicKey)}
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              Copy Public Key
            </button>
            {pgpIdentity.privateKey && (
              <button className="btn btn-sm btn-warning gap-2" onClick={handleDownloadPrivateKey}>
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download Private Key
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Key Actions</h2>
          {pgpIdentity.privateKey && (
            <>
              <div className="alert alert-warning shadow-lg mb-4">
                <div>
                  <ExclamationTriangleIcon className="h-6 w-6" />
                  <div>
                    <h3 className="font-bold">Important Security Notice</h3>
                    <p className="text-sm">
                      Make sure to download and securely store your private key. It cannot be recovered if lost!
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <button
                  className={`btn btn-primary text-secondary ${isUploadingKey ? "loading" : ""}`}
                  onClick={handleUploadToKeyserver}
                  disabled={isUploadingKey}
                >
                  {isUploadingKey ? "Uploading..." : "Upload to Keyserver"}
                </button>
              </div>
            </>
          )}
          <div className="flex flex-col gap-4">
            <button className="btn btn-neutral" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
