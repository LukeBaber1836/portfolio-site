// Shared (client + server) rules for the portal upload dropbox.

import type { UploadKind } from "@/lib/db/schema";

export const MAX_UPLOAD_BYTES = 5 * 1024 ** 3; // 5 GB, client-side guard only
export const UPLOAD_CHUNK_BYTES = 10 * 1024 ** 2; // FileBrowser's default chunk size

const PICTURE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif", "tif", "tiff", "bmp", "svg", "raw", "dng", "cr2", "cr3", "nef", "arw"];
const VIDEO_EXT = ["mp4", "mov", "m4v", "mkv", "avi", "webm", "wmv", "mts", "m2ts", "3gp"];
const BLOCKED_EXT = ["exe", "msi", "bat", "cmd", "com", "scr", "ps1", "vbs", "sh", "apk", "dmg", "pkg", "app", "jar"];

export const UPLOAD_KINDS: { value: UploadKind; label: string; singular: string; hint: string }[] = [
  { value: "pictures", label: "Pictures", singular: "picture", hint: "JPG, PNG, HEIC, RAW…" },
  { value: "videos", label: "Videos", singular: "video", hint: "MP4, MOV, MKV…" },
  { value: "files", label: "Files", singular: "file", hint: "Everything else — PDFs, docs, 3D models, ZIPs…" },
];

/** Projects stop accepting uploads once finished or cancelled. */
export const CLOSED_PROJECT_STATUSES = ["completed", "cancelled"] as const;

export function projectAcceptsUploads(project: { status: string; clientVisible: boolean }) {
  return project.clientVisible && !(CLOSED_PROJECT_STATUSES as readonly string[]).includes(project.status);
}

export function isUploadKind(value: string | null | undefined): value is UploadKind {
  return UPLOAD_KINDS.some((k) => k.value === value);
}

function extension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Pictures/videos are recognized by MIME type or extension; everything else lands in "files". */
export function classifyFile(file: { name: string; type: string }): UploadKind {
  const ext = extension(file.name);
  if (file.type.startsWith("image/") || PICTURE_EXT.includes(ext)) return "pictures";
  if (file.type.startsWith("video/") || VIDEO_EXT.includes(ext)) return "videos";
  return "files";
}

export type FileCheck = { ok: true; kind: UploadKind } | { ok: false; reason: "blocked" | "too_large" };

export function checkFile(file: { name: string; type: string; size: number }): FileCheck {
  const ext = extension(file.name);
  if (BLOCKED_EXT.includes(ext)) return { ok: false, reason: "blocked" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "too_large" };
  return { ok: true, kind: classifyFile(file) };
}

/** FileBrowser treats `/` in the upload path as folders; keep names flat and printable. */
export function safeFileName(name: string) {
  const cleaned = Array.from(name)
    .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
    .join("")
    .replace(/[\\/]/g, "-")
    .trim();
  return cleaned === "" || cleaned === "." || cleaned === ".." ? "upload" : cleaned;
}

/** "photo.jpg" → "photo (2).jpg". Attempt 0 returns the name unchanged. */
export function numberedFileName(name: string, attempt: number) {
  if (attempt <= 0) return name;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return `${name} (${attempt})`;
  return `${name.slice(0, dot)} (${attempt})${name.slice(dot)}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}
