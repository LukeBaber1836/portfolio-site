"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, fromZodError, ok, runAction, type ActionResult } from "@/lib/actions";
import {
  portalDeleteFile,
  portalFolderFiles,
  portalProjectFolders,
  portalRenameFile,
  portalUploadTarget,
  saveReferenceFeedback,
  submitRequest,
  updatePreferences,
} from "@/lib/dal/portal";
import { serviceType, uploadKind } from "@/lib/db/schema";

const requestSchema = z.object({
  title: z.string().trim().min(3, "Give your request a short title").max(160),
  body: z.string().trim().min(10, "Add a few details so I can help").max(5000),
  serviceType: z.enum(serviceType.enumValues).optional(),
});

export async function submitRequestAction(input: z.input<typeof requestSchema>): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    await submitRequest(parsed.data);
    revalidatePath("/portal/requests");
    return ok(undefined, "Request sent — I'll get back to you soon.");
  });
}

export async function updatePreferencesAction(prefs: { emailUpdates: boolean; emailWeeklySummary: boolean }): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = z.object({ emailUpdates: z.boolean(), emailWeeklySummary: z.boolean() }).safeParse(prefs);
    if (!parsed.success) return fromZodError(parsed.error);
    await updatePreferences(parsed.data);
    return ok(undefined, "Email preferences saved");
  });
}

const referenceFeedbackSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "declined"]).optional(),
  note: z
    .string()
    .trim()
    .max(2000, "Keep it under 2000 characters")
    .transform((v) => (v === "" ? null : v))
    .optional(),
});

/** Quick thumbs from the card, or vote + written feedback together from the feedback dialog. */
export async function saveReferenceFeedbackAction(input: { id: string; status?: string; note?: string }): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = referenceFeedbackSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const { id, status, note } = parsed.data;
    const reference = await saveReferenceFeedback(id, { status, note });
    revalidatePath(`/portal/projects/${reference.projectId}`);
    if (status === "approved") return ok(undefined, "Approved — thanks for the feedback!");
    return ok(undefined, status === "declined" ? "Noted — thanks for the feedback!" : "Feedback saved");
  });
}

const uploadTargetSchema = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(uploadKind.enumValues),
  /** Hash that just returned 404 in the browser; the server replaces it if it's still current. */
  staleHash: z.string().max(128).optional(),
});

export type UploadTarget = { uploadUrl: string; expiresAt: string; chunkBytes: number };

/** Mints (or reuses) the direct-to-storage upload URL for one project folder. */
export async function getUploadTargetAction(input: z.input<typeof uploadTargetSchema>): Promise<ActionResult<UploadTarget>> {
  return runAction(async () => {
    const parsed = uploadTargetSchema.safeParse(input);
    if (!parsed.success) return fail("Pick a project and what you are uploading.");
    return ok(await portalUploadTarget(parsed.data.projectId, parsed.data.kind, parsed.data.staleHash));
  });
}

export type StorageFile = { name: string; size: number; modified: string; type: string };

export async function listProjectFoldersAction(projectId: string): Promise<ActionResult<string[]>> {
  return runAction(async () => {
    if (!z.string().uuid().safeParse(projectId).success) return fail("Invalid project.");
    return ok(await portalProjectFolders(projectId));
  });
}

export async function listFolderFilesAction(projectId: string, folder: string): Promise<ActionResult<StorageFile[]>> {
  return runAction(async () => {
    const parsed = z.object({ projectId: z.string().uuid(), folder: z.string().min(1).max(200) }).safeParse({ projectId, folder });
    if (!parsed.success) return fail("Invalid folder.");
    return ok(await portalFolderFiles(parsed.data.projectId, parsed.data.folder));
  });
}

const fileRefSchema = z.object({
  projectId: z.string().uuid(),
  folder: z.string().min(1).max(200),
  name: z.string().min(1).max(255),
});

export async function renameFileAction(projectId: string, folder: string, name: string, newName: string): Promise<ActionResult<string>> {
  return runAction(async () => {
    const parsed = fileRefSchema.extend({ newName: z.string().trim().min(1, "Give the file a name").max(255) }).safeParse({ projectId, folder, name, newName });
    if (!parsed.success) return fromZodError(parsed.error);
    const saved = await portalRenameFile(parsed.data.projectId, parsed.data.folder, parsed.data.name, parsed.data.newName);
    return ok(saved, "File renamed");
  });
}

export async function deleteFileAction(projectId: string, folder: string, name: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = fileRefSchema.safeParse({ projectId, folder, name });
    if (!parsed.success) return fail("Invalid file.");
    await portalDeleteFile(parsed.data.projectId, parsed.data.folder, parsed.data.name);
    return ok(undefined, "File deleted");
  });
}
