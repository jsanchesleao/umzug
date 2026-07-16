import type { FullBackupOutcome } from "./fullBackup";

/**
 * Full backups pair on their own peer-ID prefix and deep-link param so a
 * backup-receive session can never dial into an apartment/task/document one.
 */
export const BACKUP_PEER_PREFIX = "umzugbackup-";
export const BACKUP_LINK_PARAM = "p2pbackup";

/**
 * Phase 1 of a backup transfer: the core JSON payload (apartments, tasks,
 * dashboard notes — no document bytes) sent as a single message, mirroring
 * `P2PMessage` in `p2p.ts`. The `ack` carries `canReceiveDocuments` so the
 * sender knows whether to follow up with phase 2 (a chunked document stream
 * reusing `p2pDocs.ts`'s protocol on the same connection) — the receiver
 * can't accept documents if its own vault is locked.
 */
export type BackupMessage =
  | { type: "payload"; data: string }
  | { type: "ack"; outcome: FullBackupOutcome; canReceiveDocuments: boolean }
  | { type: "error"; message: string };
