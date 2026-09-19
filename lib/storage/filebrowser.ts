import "server-only";

import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { clients, projects, projectUploadShares, type Client, type Project, type UploadKind } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { audit } from "@/lib/services/audit";
import {
  UPLOAD_KIND_FOLDERS,
  defaultClientStoragePath,
  normalizeStoragePath,
  projectFolderName,
  projectKindPath,
} from "@/lib/storage/paths";
import { UPLOAD_KINDS } from "@/lib/upload/kinds";

// FileBrowser Quantum API client (verified against v1.5.6-stable and v2.0.6-beta).
// Uses the `portal-service` API token — never import this from client code.

const SHARE_TTL_DAYS = 7;
const SHARE_ROTATE_BEFORE_MS = 24 * 60 * 60 * 1000;

export class StorageError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export function isStorageEnabled() {
  return Boolean(env.FILEBROWSER_API_TOKEN);
}

async function fbFetch(path: string, init: { method: string; query?: Record<string, string>; json?: unknown }) {
  const token = env.FILEBROWSER_API_TOKEN;
  if (!token) throw new StorageError("FILEBROWSER_API_TOKEN is not set", 0);

  const url = new URL(path, env.STORAGE_URL);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new StorageError(`FileBrowser unreachable: ${err instanceof Error ? err.message : String(err)}`, 0);
  }
  return res;
}

async function failure(res: Response, action: string) {
  const body = await res.text().catch(() => "");
  return new StorageError(`${action} failed (${res.status}): ${body.slice(0, 200)}`, res.status);
}

export type StorageEntry = { name: string; size: number; modified: string; type: string };

/** Lists one folder. Missing folder (404) reads as empty — provisioning is lazy. */
export async function listFolder(path: string): Promise<{ folders: StorageEntry[]; files: StorageEntry[] }> {
  const res = await fbFetch("/api/resources", { method: "GET", query: { source: env.FILEBROWSER_SOURCE, path } });
  if (res.status === 404) return { folders: [], files: [] };
  if (!res.ok) throw await failure(res, `List ${path}`);
  const data = (await res.json()) as { folders?: StorageEntry[]; files?: StorageEntry[] };
  const pick = (e: StorageEntry) => ({ name: e.name, size: e.size, modified: e.modified, type: e.type });
  return { folders: (data.folders ?? []).map(pick), files: (data.files ?? []).map(pick) };
}

/**
 * Renames one entry. FileBrowser reports per-item failures inside a 200 body,
 * and it overwrites an existing target silently — callers must check first.
 */
export async function renameEntry(fromPath: string, toPath: string) {
  const source = env.FILEBROWSER_SOURCE;
  const res = await fbFetch("/api/resources", {
    method: "PATCH",
    query: { source },
    json: { action: "rename", items: [{ fromSource: source, fromPath, toSource: source, toPath }] },
  });
  if (!res.ok) throw await failure(res, `Rename ${fromPath}`);
  const data = (await res.json()) as { failed?: { message?: string }[] };
  if (data.failed?.length) throw new StorageError(data.failed[0]?.message ?? "Rename failed", 500);
}

/** Deletes one entry. Already gone (404) counts as success. */
export async function deleteEntry(path: string) {
  const res = await fbFetch("/api/resources", { method: "DELETE", query: { source: env.FILEBROWSER_SOURCE, path } });
  if (res.ok || res.status === 404) return;
  throw await failure(res, `Delete ${path}`);
}

/** Creates a folder (and any missing parents). Already existing is fine. */
export async function ensureFolder(path: string) {
  const res = await fbFetch("/api/resources", {
    method: "POST",
    query: { source: env.FILEBROWSER_SOURCE, path, isDir: "true" },
  });
  if (res.ok || res.status === 409) return;
  throw await failure(res, `Create folder ${path}`);
}

async function createUploadShare(path: string, title: string) {
  const res = await fbFetch("/api/share", {
    method: "POST",
    json: {
      source: env.FILEBROWSER_SOURCE,
      path,
      shareType: "upload",
      expires: String(SHARE_TTL_DAYS),
      unit: "days",
      title,
    },
  });
  if (!res.ok) throw await failure(res, `Create upload share for ${path}`);
  const data = (await res.json()) as { hash?: string; expire?: number };
  if (!data.hash) throw new StorageError("Upload share response had no hash", res.status);
  const expiresAt = data.expire ? new Date(data.expire * 1000) : new Date(Date.now() + SHARE_TTL_DAYS * 86_400_000);
  return { hash: data.hash, expiresAt };
}

/** Deletes a share. Already gone (400/404) counts as success. */
async function deleteShare(hash: string) {
  const res = await fbFetch("/api/share", { method: "DELETE", query: { hash } });
  if (res.ok || res.status === 400 || res.status === 404) return;
  throw await failure(res, "Delete share");
}

/** Resolves (and persists) the client's root folder path without touching FileBrowser. */
async function resolveClientRoot(client: Client) {
  const existing = normalizeStoragePath(client.storagePath);
  if (existing) return existing;

  let candidate = defaultClientStoragePath(client);
  const [taken] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.storagePath, candidate), ne(clients.id, client.id)))
    .limit(1);
  if (taken) candidate = defaultClientStoragePath(client, true);

  await db.update(clients).set({ storagePath: candidate }).where(eq(clients.id, client.id));
  client.storagePath = candidate;
  return candidate;
}

export async function ensureClientFolder(client: Client) {
  const root = await resolveClientRoot(client);
  await ensureFolder(`/${root}`);
  await db.update(clients).set({ storageProvisionedAt: new Date() }).where(eq(clients.id, client.id));
  return root;
}

export async function ensureProjectFolders(project: Project, client: Client) {
  const root = await resolveClientRoot(client);
  let folder = project.storageFolder;
  if (!folder) {
    folder = projectFolderName(project);
    // Two projects for the same client can share a name; the second gets a short suffix.
    const [taken] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.clientId, project.clientId), eq(projects.storageFolder, folder), ne(projects.id, project.id)))
      .limit(1);
    if (taken) folder = projectFolderName(project, true);
    await db.update(projects).set({ storageFolder: folder }).where(eq(projects.id, project.id));
    project.storageFolder = folder;
  }
  // FileBrowser creates missing parents, so the kind folders cover the client + project folders too.
  for (const kind of UPLOAD_KIND_FOLDERS) await ensureFolder(projectKindPath(root, folder, kind));
  const now = new Date();
  await db.update(projects).set({ storageProvisionedAt: now }).where(eq(projects.id, project.id));
  if (!client.storageProvisionedAt) await db.update(clients).set({ storageProvisionedAt: now }).where(eq(clients.id, client.id));
  return { root, folder };
}

/**
 * Returns a live upload-share hash for (project, kind), creating or rotating it as needed.
 * `staleHash`: a hash the browser got a 404 for (e.g. deleted in FileBrowser) — replaced if still current.
 */
export async function getOrRotateShare(project: Project, client: Client, kind: UploadKind, staleHash?: string) {
  const where = and(eq(projectUploadShares.projectId, project.id), eq(projectUploadShares.kind, kind));
  const [row] = await db.select().from(projectUploadShares).where(where);
  if (row && row.hash !== staleHash && row.expiresAt.getTime() - Date.now() > SHARE_ROTATE_BEFORE_MS) return row;

  // Re-ensure folders whenever we mint (at most weekly) so a folder deleted in FileBrowser self-heals.
  const { root, folder } = await ensureProjectFolders(project, client);
  const label = UPLOAD_KINDS.find((k) => k.value === kind)?.label ?? kind;
  const created = await createUploadShare(projectKindPath(root, folder, kind), `${client.company || client.name} · ${project.name} · ${label}`);

  // Optimistic write: if another request won the race, keep theirs and discard ours.
  const written = row
    ? await db
        .update(projectUploadShares)
        .set({ hash: created.hash, expiresAt: created.expiresAt, createdAt: new Date() })
        .where(and(where, eq(projectUploadShares.hash, row.hash)))
        .returning()
    : await db
        .insert(projectUploadShares)
        .values({ projectId: project.id, kind, hash: created.hash, expiresAt: created.expiresAt })
        .onConflictDoNothing()
        .returning();

  if (written.length === 0) {
    await deleteShare(created.hash).catch((err) => console.error("[storage] discard raced share", err));
    const [winner] = await db.select().from(projectUploadShares).where(where);
    if (!winner) throw new StorageError("Upload share disappeared during rotation", 0);
    return winner;
  }
  if (row) await deleteShare(row.hash).catch((err) => console.error("[storage] delete rotated share", err));
  return written[0]!;
}

/**
 * Revokes upload links so previously handed-out hashes stop working. Never throws:
 * callers are admin actions that must not fail because FileBrowser is down.
 */
export async function revokeUploadShares(scope: { projectIds: string[] } | { clientId: string }, reason: string, actorUserId?: string) {
  if (!isStorageEnabled()) return;
  try {
    const projectIds =
      "projectIds" in scope
        ? scope.projectIds
        : (await db.select({ id: projects.id }).from(projects).where(eq(projects.clientId, scope.clientId))).map((p) => p.id);
    if (projectIds.length === 0) return;

    const rows = await db.select().from(projectUploadShares).where(inArray(projectUploadShares.projectId, projectIds));
    if (rows.length === 0) return;
    await db.delete(projectUploadShares).where(inArray(projectUploadShares.projectId, projectIds));

    const results = await Promise.allSettled(rows.map((r) => deleteShare(r.hash)));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) console.error(`[storage] ${failed} share(s) could not be deleted in FileBrowser; they expire within ${SHARE_TTL_DAYS} days`);
    for (const projectId of new Set(rows.map((r) => r.projectId))) {
      await audit({ actorUserId, action: "project.upload_links_revoked", entityType: "project", entityId: projectId, metadata: { reason, failed } });
    }
  } catch (err) {
    console.error("[storage] revokeUploadShares failed", err);
  }
}

/**
 * Best-effort provisioning for admin create flows. Returns a notice suffix for the
 * action message when FileBrowser couldn't be reached ("" on success or when disabled).
 */
export async function provisionStorage(target: { client: Client; project?: Project }, actorUserId: string) {
  if (!isStorageEnabled()) return "";
  const { client, project } = target;
  const entityType = project ? "project" : "client";
  const entityId = project?.id ?? client.id;
  try {
    const result = project ? await ensureProjectFolders(project, client) : { root: await ensureClientFolder(client) };
    await audit({ actorUserId, action: `${entityType}.storage_provisioned`, entityType, entityId, metadata: result });
    return "";
  } catch (err) {
    console.error(`[storage] provisioning ${entityType} ${entityId} failed`, err);
    await audit({
      actorUserId,
      action: `${entityType}.storage_provision_failed`,
      entityType,
      entityId,
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
    return " — file storage folder couldn't be created yet (it will be created on the first upload)";
  }
}
