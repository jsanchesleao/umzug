import type { DocumentEntry, DocumentIndex } from "../documents/types";

/** Normalizes a virtual folder path: trims segments, drops empties. Root is "". */
export function normalizeFolderPath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join("/");
}

export function joinPath(folder: string, name: string): string {
  return folder ? `${folder}/${name}` : name;
}

export function parentPath(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

export function pathName(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

/** True when `path` equals `ancestor` or lives anywhere below it. */
export function isSameOrDescendant(path: string, ancestor: string): boolean {
  if (ancestor === "") return true;
  return path === ancestor || path.startsWith(`${ancestor}/`);
}

/** Rewrites `path` when it is `from` or below it; returns it unchanged otherwise. */
export function rewriteFolderPrefix(path: string, from: string, to: string): string {
  if (path === from) return to;
  if (path.startsWith(`${from}/`)) return normalizeFolderPath(`${to}/${path.slice(from.length + 1)}`);
  return path;
}

/** Returns `folders` plus `path` and all its ancestors, deduped and sorted. */
export function ensureFolder(folders: string[], path: string): string[] {
  const set = new Set(folders);
  let current = normalizeFolderPath(path);
  while (current !== "") {
    set.add(current);
    current = parentPath(current);
  }
  return [...set].sort();
}

export function listAllFolders(index: DocumentIndex): string[] {
  return [...index.folders].sort();
}

/** Direct subfolders of `folder` within the index. */
export function listSubfolders(index: DocumentIndex, folder: string): string[] {
  return index.folders.filter((path) => path !== "" && parentPath(path) === folder).sort();
}

export function listEntriesInFolder(index: DocumentIndex, folder: string): DocumentEntry[] {
  return index.entries
    .filter((entry) => entry.folder === folder)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** "lease.pdf" → "lease (2).pdf" until the name no longer collides. */
export function uniqueName(name: string, existing: string[]): string {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;

  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

/**
 * Moves entries and whole folder subtrees into `dest`. Pure index rewrite —
 * blobs never move. Entries landing in an occupied folder yield their name
 * (`uniqueName`) to whatever was already there.
 */
export function moveInIndex(
  index: DocumentIndex,
  entryIds: string[],
  folderPaths: string[],
  dest: string,
): DocumentIndex {
  const destination = normalizeFolderPath(dest);
  const now = new Date().toISOString();
  const roots = folderPaths.filter(
    (path) => !folderPaths.some((other) => other !== path && isSameOrDescendant(path, other)),
  );

  let folders = [...index.folders];
  const entries = index.entries.map((entry) => ({ ...entry }));

  for (const root of roots) {
    const target = joinPath(destination, pathName(root));
    if (target === root || isSameOrDescendant(destination, root)) continue;
    folders = folders.map((folder) => rewriteFolderPrefix(folder, root, target));
    for (const entry of entries) {
      if (isSameOrDescendant(entry.folder, root)) {
        entry.folder = rewriteFolderPrefix(entry.folder, root, target);
        entry.updatedAt = now;
      }
    }
  }

  const movedIds = new Set(entryIds);
  for (const entry of entries) {
    if (movedIds.has(entry.id) && entry.folder !== destination) {
      entry.folder = destination;
      entry.updatedAt = now;
    }
  }

  if (destination !== "") folders = ensureFolder(folders, destination);
  folders = [...new Set(folders)].sort();

  // Resolve name collisions: moved entries yield to ones already in place.
  const namesPerFolder = new Map<string, string[]>();
  const claim = (entry: DocumentEntry) => {
    const names = namesPerFolder.get(entry.folder) ?? [];
    entry.name = uniqueName(entry.name, names);
    names.push(entry.name);
    namesPerFolder.set(entry.folder, names);
  };
  for (const entry of entries) if (entry.updatedAt !== now) claim(entry);
  for (const entry of entries) if (entry.updatedAt === now) claim(entry);

  return { ...index, folders, entries };
}

/** Renames one folder; caller must have validated the name against siblings. */
export function renameFolderInIndex(
  index: DocumentIndex,
  path: string,
  newName: string,
): DocumentIndex {
  const target = joinPath(parentPath(path), newName.trim());
  if (target === path) return index;
  const now = new Date().toISOString();
  return {
    ...index,
    folders: [...new Set(index.folders.map((f) => rewriteFolderPrefix(f, path, target)))].sort(),
    entries: index.entries.map((entry) =>
      isSameOrDescendant(entry.folder, path)
        ? { ...entry, folder: rewriteFolderPrefix(entry.folder, path, target), updatedAt: now }
        : entry,
    ),
  };
}

export interface SelectedDocument {
  entry: DocumentEntry;
  /** Path relative to the selection root — used for zip layout and p2p transfer. */
  relativePath: string;
}

/**
 * Expands a selection of entry ids and folder paths into concrete documents.
 * Entries inside a selected folder keep the folder itself as their top-level
 * segment so zips/transfers preserve the subtree; directly selected entries
 * sit at the root. Duplicate relative paths are made unique.
 */
export function collectSelection(
  index: DocumentIndex,
  entryIds: string[],
  folderPaths: string[],
): SelectedDocument[] {
  // Drop folders nested inside other selected folders to avoid double-counting.
  const roots = folderPaths.filter(
    (path) => !folderPaths.some((other) => other !== path && isSameOrDescendant(path, other)),
  );

  const selected: SelectedDocument[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    const base = parentPath(root);
    for (const entry of index.entries) {
      if (!isSameOrDescendant(entry.folder, root)) continue;
      seen.add(entry.id);
      const relativeFolder = base === "" ? entry.folder : entry.folder.slice(base.length + 1);
      selected.push({ entry, relativePath: joinPath(relativeFolder, entry.name) });
    }
  }

  const idSet = new Set(entryIds);
  for (const entry of index.entries) {
    if (!idSet.has(entry.id) || seen.has(entry.id)) continue;
    selected.push({ entry, relativePath: entry.name });
  }

  const usedPaths: string[] = [];
  return selected.map(({ entry, relativePath }) => {
    const folder = parentPath(relativePath);
    const name = uniqueName(
      pathName(relativePath),
      usedPaths.filter((p) => parentPath(p) === folder).map(pathName),
    );
    const unique = joinPath(folder, name);
    usedPaths.push(unique);
    return { entry, relativePath: unique };
  });
}
