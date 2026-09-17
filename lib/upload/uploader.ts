// Browser-side uploader for FileBrowser upload shares (POST /public/api/resources?hash=…).
// Uses XHR for upload progress, FileBrowser's chunk protocol for large files, and
// renames on 409 itself — FileBrowser v1.5/v2.0 ignore `action=rename` on shares.

import { numberedFileName, safeFileName } from "@/lib/upload/kinds";

export type UploadTarget = { uploadUrl: string; chunkBytes: number };

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

type UploadOptions = {
  file: File;
  target: UploadTarget;
  /** Called with the dead target when its share hash expired or was revoked (404). */
  refreshTarget: (stale: UploadTarget) => Promise<UploadTarget>;
  onProgress: (loadedBytes: number) => void;
  signal: AbortSignal;
};

const MAX_RENAMES = 50;
const MAX_RETRIES = 3;
const MAX_REFRESHES = 2;
const STALL_TIMEOUT_MS = 30_000;

export function isAbortError(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError";
}

function abortError() {
  return new DOMException("Upload cancelled", "AbortError");
}

function sessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function post(url: string, body: Blob, headers: Record<string, string>, signal: AbortSignal, onProgress: (loaded: number) => void) {
  return new Promise<number>((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    let stalled = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    // A proxy that doesn't buffer request bodies can hang when FileBrowser rejects early
    // (404/409) — treat "no progress for a while" as a network failure so it retries.
    const kick = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        stalled = true;
        xhr.abort();
      }, STALL_TIMEOUT_MS);
    };
    const onAbort = () => xhr.abort();
    const settle = (fn: () => void) => () => {
      clearTimeout(watchdog);
      signal.removeEventListener("abort", onAbort);
      fn();
    };
    xhr.upload.onprogress = (e) => {
      kick();
      onProgress(e.loaded);
    };
    xhr.onload = settle(() => resolve(xhr.status));
    // Network failures and blocked CORS both surface as status 0.
    xhr.onerror = settle(() => resolve(0));
    xhr.onabort = settle(() => (stalled ? resolve(0) : reject(abortError())));
    signal.addEventListener("abort", onAbort, { once: true });
    kick();
    xhr.send(body);
  });
}

function describe(status: number) {
  if (status === 0) return "Couldn't reach file storage. Check your connection and try again.";
  if (status === 404) return "The upload link expired. Try again.";
  if (status === 403) return "Uploads to this folder aren't allowed right now.";
  if (status === 413) return "This file is too large for the storage server.";
  if (status >= 500) return "The storage server had a problem. Try again.";
  return `Upload failed (${status}).`;
}

/** Uploads one file; resolves with the name it was saved as. */
export async function uploadFile({ file, target: initialTarget, refreshTarget, onProgress, signal }: UploadOptions) {
  let target = initialTarget;
  let refreshes = 0;
  const total = file.size;
  const chunked = target.chunkBytes > 0 && total > target.chunkBytes;
  const baseName = safeFileName(file.name);

  /** Sends [offset, end). Returns the new offset, or "conflict" when the name is taken. */
  async function sendPiece(name: string, session: string, offset: number): Promise<number | "conflict"> {
    const end = chunked ? Math.min(offset + target.chunkBytes, total) : total;
    const body = file.slice(offset, end);
    const headers: Record<string, string> = { "X-File-Total-Size": String(total), "X-File-Upload-Session": session };
    if (chunked) headers["X-File-Chunk-Offset"] = String(offset);

    for (let attempt = 0; ; attempt++) {
      const url = `${target.uploadUrl}&path=${encodeURIComponent(name)}`;
      const status = await post(url, body, headers, signal, (loaded) => onProgress(offset + loaded));
      if (status >= 200 && status < 300) {
        onProgress(end);
        return end;
      }
      // FileBrowser checks name conflicts on the first request of a file only.
      if (status === 409 && offset === 0) return "conflict";
      if (status === 404 && refreshes < MAX_REFRESHES) {
        refreshes++;
        target = await refreshTarget(target);
        continue;
      }
      const retryable = status === 0 || status === 409 || status === 429 || status >= 500;
      if (!retryable || attempt >= MAX_RETRIES) throw new UploadError(describe(status), status);
      await sleep(1000 * 2 ** attempt, signal);
    }
  }

  for (let rename = 0; rename <= MAX_RENAMES; rename++) {
    const name = numberedFileName(baseName, rename);
    const session = sessionId();
    const first = await sendPiece(name, session, 0);
    if (first === "conflict") continue;
    let offset = first;
    while (offset < total) {
      const next = await sendPiece(name, session, offset);
      if (next === "conflict") throw new UploadError(describe(409), 409);
      offset = next;
    }
    return { name };
  }
  throw new UploadError("Too many files already have this name. Rename it and try again.", 409);
}
