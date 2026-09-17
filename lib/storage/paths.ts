// Pure path helpers for FileBrowser storage. The only place storage paths are built.
// Kept free of server-only imports so they can be unit-tested.

import type { UploadKind } from "@/lib/db/schema";

export const UPLOAD_KIND_FOLDERS: readonly UploadKind[] = ["pictures", "videos", "files"];

/** ASCII, lowercase, dash-separated. Never empty. */
export function slugify(text: string, fallback = "untitled", max = 48) {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug || fallback;
}

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

export function defaultClientStoragePath(client: { id: string; name: string; company: string | null }, withSuffix = false) {
  const base = slugify(client.company || client.name, "client");
  return `clients/${withSuffix ? `${base}-${client.id.slice(0, 6)}` : base}`;
}

export function projectFolderName(project: { id: string; name: string }) {
  return `${slugify(project.name, "project", 40)}-${project.id.slice(0, 6)}`;
}

/** Absolute FileBrowser index path (leading slash) for a project's kind folder. */
export function projectKindPath(clientRoot: string, projectFolder: string, kind: UploadKind) {
  const root = normalizeStoragePath(clientRoot);
  const folder = normalizeStoragePath(projectFolder);
  if (!root || !folder || folder.includes("/")) throw new Error("Invalid storage path");
  if (!UPLOAD_KIND_FOLDERS.includes(kind)) throw new Error("Invalid upload kind");
  return `/${root}/${folder}/${kind}`;
}
