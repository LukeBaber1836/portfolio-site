"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dollarsToCents, fail, fromZodError, ok, optionalText, runAction, type ActionResult } from "@/lib/actions";
import {
  addClientContact,
  createClient,
  removeClientContact,
  resendInvite,
  setClientStatus,
  updateClient,
} from "@/lib/dal/admin/clients";
import { normalizeStoragePath } from "@/lib/storage/paths";

const clientSchema = z.object({
  name: z.string().trim().min(2, "Enter the contact's name").max(120),
  company: optionalText,
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: optionalText,
  defaultRate: dollarsToCents.optional(),
  termsDays: z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" ? undefined : Number(v)))
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= 0 && v <= 120), "0–120 days")
    .optional(),
  storageUsername: optionalText,
  storagePath: optionalText
    .refine((v) => v === undefined || normalizeStoragePath(v) !== null, "Use a folder name like Acme Co (no . or .. segments)")
    .transform((v) => normalizeStoragePath(v) ?? undefined),
  notesInternal: optionalText,
});

export type ClientFormInput = z.input<typeof clientSchema> & { sendInvite?: boolean };

export async function createClientAction(input: ClientFormInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = clientSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const { defaultRate, ...rest } = parsed.data;
    const client = await createClient({ ...rest, defaultRateCents: defaultRate, sendInvite: input.sendInvite ?? true });
    revalidatePath("/admin", "layout");
    const base = input.sendInvite === false ? "Client created" : "Client created and invite sent";
    return ok({ id: client.id }, base + client.emailNotice);
  });
}

export async function updateClientAction(id: string, input: ClientFormInput): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = clientSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const { defaultRate, ...rest } = parsed.data;
    await updateClient(id, { ...rest, defaultRateCents: defaultRate });
    revalidatePath("/admin", "layout");
    return ok(undefined, "Client updated");
  });
}

export async function setClientStatusAction(id: string, status: "active" | "archived"): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await setClientStatus(id, status);
    revalidatePath("/admin", "layout");
    return ok(undefined, status === "archived" ? "Client archived" : "Client restored");
  });
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  sendInvite: z.boolean(),
});

export async function addContactAction(clientId: string, input: z.input<typeof contactSchema>): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const { emailNotice } = await addClientContact(clientId, parsed.data);
    revalidatePath(`/admin/clients/${clientId}`);
    const base = parsed.data.sendInvite ? "Contact added and invited" : "Contact added";
    return ok(undefined, base + emailNotice);
  });
}

export async function resendInviteAction(clientId: string, userId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    if (!z.string().uuid().safeParse(userId).success) return fail("Invalid contact.");
    const { emailNotice } = await resendInvite(clientId, userId);
    revalidatePath(`/admin/clients/${clientId}`);
    return ok(undefined, "Invite sent" + emailNotice);
  });
}

export async function removeContactAction(clientId: string, userId: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await removeClientContact(clientId, userId);
    revalidatePath(`/admin/clients/${clientId}`);
    return ok(undefined, "Contact removed");
  });
}
