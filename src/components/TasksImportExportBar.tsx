import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { describeOutcome, downloadJson, type CollisionResolution } from "../data/importExport";
import {
  buildAllTasksExport,
  detectTaskCollisions,
  importTasks,
  parseTaskImportPayload,
  type ExportedTask,
} from "../data/taskImportExport";
import ImportCollisionDialog from "./ImportCollisionDialog";
import TaskP2PSendModal from "./TaskP2PSendModal";
import TaskP2PReceiveModal from "./TaskP2PReceiveModal";

type Status = { type: "error" | "success"; message: string } | null;

interface PendingImport {
  tasks: ExportedTask[];
  collisionCount: number;
}

function TasksImportExportBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [p2pModal, setP2PModal] = useState<"send" | "receive" | null>(null);
  const [initialPairingCode, setInitialPairingCode] = useState<string | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  useEffect(() => {
    const code = searchParams.get("p2ptask");
    if (code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to an external system (the URL) on mount, not deriving render state
      setInitialPairingCode(code);
      setP2PModal("receive");
      setSearchParams((params) => {
        params.delete("p2ptask");
        return params;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExportAll() {
    const tasks = await buildAllTasksExport();
    downloadJson(`umzug-tasks-export-${new Date().toISOString().slice(0, 10)}.json`, tasks);
    setStatus({
      type: "success",
      message: `Exported ${tasks.length} task${tasks.length === 1 ? "" : "s"}.`,
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStatus(null);
    try {
      const text = await file.text();
      const tasks = parseTaskImportPayload(text);
      if (tasks.length === 0) {
        setStatus({ type: "error", message: "File contains no tasks." });
        return;
      }

      const collidingIds = await detectTaskCollisions(tasks);
      if (collidingIds.length > 0) {
        setPendingImport({ tasks, collisionCount: collidingIds.length });
        return;
      }

      const outcome = await importTasks(tasks, "copy");
      setStatus({ type: "success", message: describeOutcome(outcome) });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Import failed.",
      });
    }
  }

  async function handleResolveCollisions(resolution: CollisionResolution) {
    if (!pendingImport) return;
    try {
      const outcome = await importTasks(pendingImport.tasks, resolution);
      setStatus({ type: "success", message: describeOutcome(outcome) });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Import failed.",
      });
    } finally {
      setPendingImport(null);
    }
  }

  return (
    <div className="import-export-bar">
      <details className="status-menu" ref={menuRef}>
        <summary className="status-menu-trigger" aria-label="Import and export actions">
          ☰
        </summary>
        <div className="status-menu-list dashboard-menu-list">
          <button
            type="button"
            className="status-menu-option"
            onClick={() => {
              handleExportAll();
              closeMenu();
            }}
          >
            Export all
          </button>
          <button
            type="button"
            className="status-menu-option"
            onClick={() => {
              fileInputRef.current?.click();
              closeMenu();
            }}
          >
            Import
          </button>
          <button
            type="button"
            className="status-menu-option"
            onClick={() => {
              setP2PModal("send");
              closeMenu();
            }}
          >
            Send (all)
          </button>
          <button
            type="button"
            className="status-menu-option"
            onClick={() => {
              setInitialPairingCode(undefined);
              setP2PModal("receive");
              closeMenu();
            }}
          >
            Receive
          </button>
        </div>
      </details>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-label="Import tasks from JSON file"
        onChange={handleFileChange}
      />

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

      {pendingImport && (
        <ImportCollisionDialog
          count={pendingImport.collisionCount}
          entityLabel="task"
          onResolve={handleResolveCollisions}
          onCancel={() => setPendingImport(null)}
        />
      )}

      {p2pModal === "send" && (
        <TaskP2PSendModal scope="all" onClose={() => setP2PModal(null)} />
      )}
      {p2pModal === "receive" && (
        <TaskP2PReceiveModal initialCode={initialPairingCode} onClose={() => setP2PModal(null)} />
      )}
    </div>
  );
}

export default TasksImportExportBar;
