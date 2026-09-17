"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, fromZodError, ok, runAction, type ActionResult } from "@/lib/actions";
import { portalUploadTarget, respondToReference, saveReferenceNote, submitRequest, updatePreferences } from "@/lib/dal/portal";
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

export async function respondToReferenceAction(id: string, status: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = z.object({ id: z.string().uuid(), status: z.enum(["approved", "declined"]) }).safeParse({ id, status });
    if (!parsed.success) return fail("Invalid response.");
    const reference = await respondToReference(parsed.data.id, parsed.data.status);
    revalidatePath(`/portal/projects/${reference.projectId}`);
    return ok(undefined, parsed.data.status === "approved" ? "Approved — thanks for the feedback!" : "Noted — thanks for the feedback!");
  });
}

const referenceNoteSchema = z.object({
  id: z.string().uuid(),
  note: z.string().trim().max(2000, "Keep it under 2000 characters").transform((v) => (v === "" ? null : v)),
});

export async function saveReferenceNoteAction(id: string, note: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = referenceNoteSchema.safeParse({ id, note });
    if (!parsed.success) return fromZodError(parsed.error);
    const reference = await saveReferenceNote(parsed.data.id, parsed.data.note);
    revalidatePath(`/portal/projects/${reference.projectId}`);
    return ok(undefined, "Note saved");
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
