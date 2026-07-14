import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useVault } from "../documents/useVault";
import VaultSetup from "../components/VaultSetup";
import VaultUnlock from "../components/VaultUnlock";
import DocumentsBrowser from "../components/DocumentsBrowser";
import DocReceiveModal from "../components/DocReceiveModal";

function Documents() {
  const { status } = useVault();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingReceiveCode, setPendingReceiveCode] = useState<string | null>(null);

  // A scanned QR code deep-links here with ?p2pdoc=<code>; keep the code and
  // strip the param so a reload/back navigation doesn't reopen the modal. The
  // receive modal itself only opens once the vault is unlocked.
  useEffect(() => {
    const code = searchParams.get("p2pdoc");
    if (code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to an external system (the URL) on mount, not deriving render state
      setPendingReceiveCode(code);
      setSearchParams(
        (params) => {
          params.delete("p2pdoc");
          return params;
        },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="documents-page page">
      {status === "unsupported" && (
        <div className="banner banner-error">
          This browser does not support the storage features (OPFS) the document vault needs. Try
          a recent version of Chrome, Edge, or Firefox.
        </div>
      )}

      {(status === "locked" || status === "uninitialized") && pendingReceiveCode && (
        <div className="banner banner-success">
          Unlock the vault to receive the incoming documents.
        </div>
      )}

      {status === "uninitialized" && <VaultSetup />}
      {status === "locked" && <VaultUnlock />}
      {status === "unlocked" && <DocumentsBrowser />}

      {status === "unlocked" && pendingReceiveCode && (
        <DocReceiveModal
          initialCode={pendingReceiveCode}
          onClose={() => setPendingReceiveCode(null)}
        />
      )}
    </main>
  );
}

export default Documents;
