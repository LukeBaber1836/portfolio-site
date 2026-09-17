"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, fromZodError, ok, optionalText, runAction, type ActionResult } from "@/lib/actions";
import {
  createDraftInvoice,
  finalizeAndSendInvoice,
  markInvoicePaidOutOfBand,
  previewInvoice,
  resyncInvoice,
  sendInvoiceReminder,
  voidInvoice,
} from "@/lib/dal/admin/invoices";
import { listUnbilledForClient } from "@/lib/dal/admin/time";

const uuid = z.string().uuid();

export async function loadUnbilledAction(clientId: string) {
  if (!uuid.safeParse(clientId).success) return [];
  const rows = await listUnbilledForClient(clientId);
  return rows.map((r) => ({
    id: r.entry.id,
    projectId: r.entry.projectId,
    projectName: r.projectName,
    startedAt: r.entry.startedAt.toISOString(),
    durationSeconds: r.entry.durationSeconds ?? 0,
    rateCents: r.entry.rateCents,
    description: r.entry.description,
  }));
}

export async function previewInvoiceAction(clientId: string, entryIds: string[]) {
  if (!uuid.safeParse(clientId).success) return { groups: [], roundingMinutes: 0 };
  const { groups, roundingMinutes } = await previewInvoice(clientId, entryIds.filter((id) => uuid.safeParse(id).success));
  return {
    roundingMinutes,
    groups: groups.map((g) => ({
      key: g.key,
      projectName: g.projectName,
      rateCents: g.rateCents,
      loggedSeconds: g.loggedSeconds,
      billedSeconds: g.billedSeconds,
      amountCents: g.amountCents,
      entryCount: g.entryIds.length,
    })),
  };
}

const draftSchema = z.object({
  clientId: uuid,
  entryIds: z.array(uuid).max(1000),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(2, "Describe the item").max(300),
        quantity: z.number().int().min(1).max(10000),
        unitAmountCents: z.number().int().min(1, "Amount must be positive").max(100_000_00),
      }),
    )
    .max(50),
  daysUntilDue: z.number().int().min(0).max(120),
  memo: optionalText,
});

export async function createDraftInvoiceAction(input: z.input<typeof draftSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = draftSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const id = await createDraftInvoice(parsed.data);
    revalidatePath("/admin", "layout");
    return ok({ id }, "Draft created in Stripe");
  });
}

type InvoiceOp = "send" | "void" | "markPaid" | "remind" | "resync";

export async function invoiceOpAction(id: string, op: InvoiceOp): Promise<ActionResult<{ result?: string }>> {
  return runAction(async () => {
    if (!uuid.safeParse(id).success) return fail("Invalid invoice.");
    let message = "";
    let result: string | undefined;
    switch (op) {
      case "send": {
        const { emailNotice } = await finalizeAndSendInvoice(id);
        message = "Invoice sent" + emailNotice;
        break;
      }
      case "void":
        result = await voidInvoice(id);
        message = result === "deleted" ? "Draft deleted — hours returned to unbilled" : "Invoice voided — hours returned to unbilled";
        break;
      case "markPaid":
        await markInvoicePaidOutOfBand(id);
        message = "Marked as paid";
        break;
      case "remind": {
        const { emailNotice } = await sendInvoiceReminder(id);
        message = "Reminder sent" + emailNotice;
        break;
      }
      case "resync":
        await resyncInvoice(id);
        message = "Synced from Stripe";
        break;
      default:
        return fail("Unknown action.");
    }
    revalidatePath("/admin", "layout");
    return ok({ result }, message);
  });
}
