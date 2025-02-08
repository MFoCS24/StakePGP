"use client";

import { useState } from "react";
import * as openpgp from "openpgp";
import {
  ArrowUpTrayIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { PGPIdentity } from "../../types/pgp";

interface ManagePGPProps {
  pgpIdentity: PGPIdentity | null;
  isLoadingIdentity: boolean;
  setPgpIdentity: (identity: PGPIdentity | null) => void;
}

export const ManagePGP = ({ pgpIdentity, isLoadingIdentity, setPgpIdentity }: ManagePGPProps) => {
  const [importKey, setImportKey] = useState("");
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [isUploadingKey, setIsUploadingKey] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [keyGenForm, setKeyGenForm] = useState({
    name: "",
    email: "",
    passphrase: "",
  });

  const handleImportKey = async () => {
    try {
      setImportError(null);

      // Try to read and validate the public key
      const publicKeyObj = await openpgp.readKey({ armoredKey: importKey });

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
      const keyId = publicKeyObj.getKeyID().toHex().toUpperCase();

      // Create PGP identity object
      const newIdentity: PGPIdentity = {
        keyId,
        name: name.trim(),
        email: email.trim(),
        publicKey: importKey,
      };

      setPgpIdentity(newIdentity);

      // Store in local storage
      localStorage.setItem("pgp_identity", JSON.stringify(newIdentity));
    } catch (error) {
      console.error("Error importing key:", error);
      setImportError(error instanceof Error ? error.message : "Invalid PGP public key format");
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
      const keyId = publicKeyObj.getKeyID().toHex().toUpperCase();

      // Create PGP identity object
      const newIdentity: PGPIdentity = {
        keyId,
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
        throw new Error("Failed to upload key to keyserver");
      }

      alert("Key successfully uploaded to keyserver!");
    } catch (error) {
      console.error("Error uploading key:", error);
      alert("Failed to upload key to keyserver. Please try again.");
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
              className={`textarea textarea-bordered h-32 ${importError ? "textarea-error" : ""}`}
              placeholder="Paste your PGP public key here..."
              value={importKey}
              onChange={e => {
                setImportKey(e.target.value);
                setImportError(null);
              }}
            ></textarea>
            {importError && (
              <div className="alert alert-error mt-2">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span className="text-sm">{importError}</span>
              </div>
            )}
            <label className="label">
              <span className="label-text-alt">The key should start with &quot;-----BEGIN PGP PUBLIC KEY BLOCK-----&quot;</span>
            </label>
          </div>
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-primary" onClick={handleImportKey} disabled={!importKey.trim()}>
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
            <KeyIcon className="h-6 w-6 text-success" />
            <h2 className="card-title">Connected PGP Identity</h2>
          </div>
          <div className="mt-4">
            <p>
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
                <ArrowUpTrayIcon className="h-4 w-4" />
                Download Private Key
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Key Actions</h2>
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
              className={`btn btn-primary ${isUploadingKey ? "loading" : ""}`}
              onClick={handleUploadToKeyserver}
              disabled={isUploadingKey}
            >
              {isUploadingKey ? "Uploading..." : "Upload to Keyserver"}
            </button>
            <button className="btn btn-error">Revoke Key</button>
          </div>
        </div>
      </div>
    </div>
  );
}; 