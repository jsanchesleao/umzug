import { useRef, useState } from "react";
import { useVault } from "../documents/useVault";
import DocumentRow from "./DocumentRow";
import DocumentViewerModal from "./DocumentViewerModal";
import DocumentEditModal from "./DocumentEditModal";
import FolderPickerModal from "./FolderPickerModal";
import NewFolderModal from "./NewFolderModal";
import DocSendModal from "./DocSendModal";
import ConfirmDialog from "./ConfirmDialog";
import { ACCEPTED_DOC_TYPES, isAcceptedDocType, type DocumentEntry } from "../documents/types";
import {
  collectSelection,
  ensureFolder,
  joinPath,
  listEntriesInFolder,
  listSubfolders,
  moveInIndex,
  pathName,
  renameFolderInIndex,
  type SelectedDocument,
} from "../utils/docPaths";
import { buildZip, downloadBlob } from "../utils/zip";

type ModalState =
  | { mode: "viewer"; entry: DocumentEntry }
  | { mode: "edit"; entry: DocumentEntry }
  | { mode: "newFolder" }
  | { mode: "renameFolder"; path: string }
  | { mode: "move"; entryIds: string[]; folderPaths: string[] }
  | { mode: "send"; docs: SelectedDocument[] }
  | { mode: "delete"; entryIds: string[]; folderPaths: string[]; message: string }
  | null;

type Status = { type: "error" | "success"; message: string } | null;

function DocumentsBrowser() {
  const { index, addFiles, mutateIndex, removeItems, getBytes } = useVault();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFolder, setCurrentFolder] = useState("");
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!index) return null;

  const subfolders = listSubfolders(index, currentFolder);
  const entries = listEntriesInFolder(index, currentFolder);
  const breadcrumbs = currentFolder === "" ? [] : currentFolder.split("/");
  const selectionCount = selectedEntries.size + selectedFolders.size;

  function navigateTo(folder: string) {
    setCurrentFolder(folder);
    clearSelection();
  }

  function clearSelection() {
    setSelectedEntries(new Set());
    setSelectedFolders(new Set());
  }

  function toggleEntry(id: string, checked: boolean) {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleFolder(path: string, checked: boolean) {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (checked) next.add(path);
      else next.delete(path);
      return next;
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const rejected = files.filter((file) => !isAcceptedDocType(file.type));
    const accepted = files.filter((file) => isAcceptedDocType(file.type));

    setStatus(null);
    setBusy("Encrypting and storing…");
    try {
      const prepared = await Promise.all(
        accepted.map(async (file) => ({
          name: file.name,
          type: file.type,
          bytes: new Uint8Array(await file.arrayBuffer()),
        })),
      );
      if (prepared.length > 0) {
        await addFiles(prepared, currentFolder);
      }
      if (rejected.length > 0) {
        setStatus({
          type: "error",
          message: `Only PDF files and images can be stored. Skipped: ${rejected
            .map((f) => f.name)
            .join(", ")}`,
        });
      } else {
        setStatus({
          type: "success",
          message: `Added ${prepared.length} document${prepared.length === 1 ? "" : "s"}.`,
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to store the documents.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadEntry(entry: DocumentEntry) {
    setStatus(null);
    try {
      const bytes = await getBytes(entry);
      downloadBlob(entry.name, new Blob([bytes], { type: entry.mimeType }));
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to decrypt the document.",
      });
    }
  }

  async function handleDownloadSelection() {
    const docs = collectSelection(index!, [...selectedEntries], [...selectedFolders]);
    if (docs.length === 0) {
      setStatus({ type: "error", message: "The selected folders contain no documents." });
      return;
    }
    if (docs.length === 1) {
      await handleDownloadEntry(docs[0].entry);
      return;
    }
    setStatus(null);
    setBusy(`Preparing zip (${docs.length} documents)…`);
    try {
      const files = [];
      for (const doc of docs) {
        files.push({ path: doc.relativePath, data: await getBytes(doc.entry) });
      }
      const zipped = await buildZip(files);
      downloadBlob(
        `umzug-documents-${new Date().toISOString().slice(0, 10)}.zip`,
        new Blob([zipped], { type: "application/zip" }),
      );
      setStatus({ type: "success", message: `Downloaded ${docs.length} documents as a zip.` });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to build the zip file.",
      });
    } finally {
      setBusy(null);
    }
  }

  function handleSendSelection() {
    const docs = collectSelection(index!, [...selectedEntries], [...selectedFolders]);
    if (docs.length === 0) {
      setStatus({ type: "error", message: "The selected folders contain no documents." });
      return;
    }
    setModal({ mode: "send", docs });
  }

  function requestDeleteSelection(entryIds: string[], folderPaths: string[]) {
    const count = collectSelection(index!, entryIds, folderPaths).length;
    const parts: string[] = [];
    if (count > 0) parts.push(`${count} document${count === 1 ? "" : "s"}`);
    if (folderPaths.length > 0)
      parts.push(`${folderPaths.length} folder${folderPaths.length === 1 ? "" : "s"}`);
    setModal({
      mode: "delete",
      entryIds,
      folderPaths,
      message: `Delete ${parts.join(" and ")}? This cannot be undone.`,
    });
  }

  async function handleConfirmDelete() {
    if (modal?.mode !== "delete") return;
    const { entryIds, folderPaths } = modal;
    setModal(null);
    setStatus(null);
    try {
      await removeItems(entryIds, folderPaths);
      clearSelection();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete.",
      });
    }
  }

  async function handleMove(dest: string) {
    if (modal?.mode !== "move") return;
    const { entryIds, folderPaths } = modal;
    setModal(null);
    setStatus(null);
    try {
      await mutateIndex((current) => moveInIndex(current, entryIds, folderPaths, dest));
      clearSelection();
      setStatus({ type: "success", message: "Moved." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to move.",
      });
    }
  }

  return (
    <section className="documents-browser">
      <nav className="doc-breadcrumbs" aria-label="Folder path">
        <button type="button" className="doc-breadcrumb" onClick={() => navigateTo("")}>
          Documents
        </button>
        {breadcrumbs.map((segment, i) => {
          const path = breadcrumbs.slice(0, i + 1).join("/");
          return (
            <span key={path}>
              <span className="doc-breadcrumb-sep" aria-hidden="true">
                /
              </span>
              <button type="button" className="doc-breadcrumb" onClick={() => navigateTo(path)}>
                {segment}
              </button>
            </span>
          );
        })}
      </nav>

      <div className="doc-toolbar">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy !== null}
          onClick={() => fileInputRef.current?.click()}
        >
          Add documents
        </button>
        <button type="button" className="btn" onClick={() => setModal({ mode: "newFolder" })}>
          New folder
        </button>
      </div>

      {status && (
        <div className={status.type === "error" ? "banner banner-error" : "banner banner-success"}>
          {status.message}
          <button
            type="button"
            className="banner-dismiss"
            aria-label="Dismiss"
            onClick={() => setStatus(null)}
          >
            ×
          </button>
        </div>
      )}
      {busy && <div className="banner banner-success">{busy}</div>}

      {selectionCount > 0 && (
        <div className="doc-selection-toolbar">
          <span className="doc-selection-count">
            {selectionCount} selected
          </span>
          <button type="button" className="btn btn-sm" onClick={handleSendSelection}>
            Send
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy !== null}
            onClick={handleDownloadSelection}
          >
            Download
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              setModal({
                mode: "move",
                entryIds: [...selectedEntries],
                folderPaths: [...selectedFolders],
              })
            }
          >
            Move
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => requestDeleteSelection([...selectedEntries], [...selectedFolders])}
          >
            Delete
          </button>
          <button type="button" className="btn btn-sm" onClick={clearSelection}>
            Clear
          </button>
        </div>
      )}

      {subfolders.length === 0 && entries.length === 0 ? (
        <p className="empty-column">
          This folder is empty. Add PDF or image documents, or create a folder.
        </p>
      ) : (
        <ul className="doc-list">
          {subfolders.map((path) => (
            <li key={path} className="doc-row doc-row-folder">
              <input
                type="checkbox"
                className="doc-row-checkbox"
                aria-label={`Select folder ${pathName(path)}`}
                checked={selectedFolders.has(path)}
                onChange={(e) => toggleFolder(path, e.target.checked)}
              />
              <button type="button" className="doc-row-main" onClick={() => navigateTo(path)}>
                <span className="doc-row-icon" aria-hidden="true">
                  📁
                </span>
                <span className="doc-row-text">
                  <span className="doc-row-name">{pathName(path)}</span>
                </span>
              </button>
              <div className="doc-row-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setModal({ mode: "renameFolder", path })}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => requestDeleteSelection([], [path])}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {entries.map((entry) => (
            <DocumentRow
              key={entry.id}
              entry={entry}
              selected={selectedEntries.has(entry.id)}
              onToggleSelected={(checked) => toggleEntry(entry.id, checked)}
              onOpen={() => setModal({ mode: "viewer", entry })}
              onDownload={() => handleDownloadEntry(entry)}
              onEdit={() => setModal({ mode: "edit", entry })}
              onDelete={() => requestDeleteSelection([entry.id], [])}
            />
          ))}
        </ul>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_DOC_TYPES}
        multiple
        className="visually-hidden"
        aria-label="Add documents"
        onChange={handleFileChange}
      />

      {modal?.mode === "viewer" && (
        <DocumentViewerModal entry={modal.entry} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <DocumentEditModal entry={modal.entry} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "newFolder" && (
        <NewFolderModal
          title="New folder"
          submitLabel="Create"
          siblingNames={subfolders.map(pathName)}
          onSubmit={(name) =>
            mutateIndex((current) => ({
              ...current,
              folders: ensureFolder(current.folders, joinPath(currentFolder, name)),
            }))
          }
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "renameFolder" && (
        <NewFolderModal
          title="Rename folder"
          submitLabel="Rename"
          initialName={pathName(modal.path)}
          siblingNames={subfolders.filter((p) => p !== modal.path).map(pathName)}
          onSubmit={(name) =>
            mutateIndex((current) => renameFolderInIndex(current, modal.path, name))
          }
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "move" && (
        <FolderPickerModal
          title="Move to folder"
          confirmLabel="Move here"
          excludeSubtreeOf={modal.folderPaths}
          onPick={handleMove}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "send" && <DocSendModal docs={modal.docs} onClose={() => setModal(null)} />}
      {modal?.mode === "delete" && (
        <ConfirmDialog
          title="Delete"
          message={modal.message}
          confirmLabel="Delete"
          danger
          onConfirm={handleConfirmDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </section>
  );
}

export default DocumentsBrowser;
