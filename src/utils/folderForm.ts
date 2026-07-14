export function validateFolderName(name: string, siblingNames: string[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Folder name is required.";
  if (trimmed.includes("/")) return 'Folder names cannot contain "/".';
  if (siblingNames.some((sibling) => sibling.toLowerCase() === trimmed.toLowerCase())) {
    return "A folder with this name already exists here.";
  }
  return null;
}
