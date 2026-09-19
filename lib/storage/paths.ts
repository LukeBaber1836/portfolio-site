// Pure path helpers for FileBrowser storage. The only place storage paths are built.
// Kept free of server-only imports so they can be unit-tested.

import type { UploadKind } from "@/lib/db/schema";

export const UPLOAD_KIND_FOLDERS: readonly UploadKind[] = ["pictures", "videos", "files"];

/**
 * Normalizes an admin-entered storage path ("/clients/Acme Co/") to "clients/Acme Co".
 * Returns null when the path is empty or unsafe (`.`/`..` segments, backslashes, control chars).
 */
export function normalizeStoragePath(input: string | null | undefined): string | null {
  if (!input) return null;
  if (input.includes("\\") || Array.from(input).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return null;
  const segments = input
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;
  if (segments.some((s) => s === "." || s === "..")) return null;
  return segments.join("/");
}

/**
 * A readable folder name: keeps spaces and capitals (matching the folders Luke
 * creates by hand) while dropping anything that would break a path.
 */
export function safeFolderName(raw: string, fallback = "untitled", max = 60) {
  const cleaned = Array.from(raw)
    .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
    .join("")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .trim()
    .slice(0, max)
    .trim();
  return cleaned || fallback;
}

/** Client folders sit at the top of the service account's scope, named for the client. */
export function defaultClientStoragePath(client: { id: string; name: string; company: string | null }, withSuffix = false) {
  const base = safeFolderName(client.company || client.name, "Client");
  return withSuffix ? `${base} (${client.id.slice(0, 6)})` : base;
}

/** Project folders sit inside the client folder, named for the project. */
export function projectFolderName(project: { id: string; name: string }, withSuffix = false) {
  const base = safeFolderName(project.name, "Project");
  return withSuffix ? `${base} (${project.id.slice(0, 6)})` : base;
}

/** Absolute FileBrowser index path (leading slash) for a project's kind folder. */
export function projectKindPath(clientRoot: string, projectFolder: string, kind: UploadKind) {
  const root = normalizeStoragePath(clientRoot);
  const folder = normalizeStoragePath(projectFolder);
  if (!root || !folder || folder.includes("/")) throw new Error("Invalid storage path");
  if (!UPLOAD_KIND_FOLDERS.includes(kind)) throw new Error("Invalid upload kind");
  return `/${root}/${folder}/${kind}`;
}
