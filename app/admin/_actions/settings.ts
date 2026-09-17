"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dollarsToCents, fail, fromZodError, ok, runAction, type ActionResult } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { setRequestStatus } from "@/lib/dal/admin/dashboard";
import { db } from "@/lib/db";
import { requestStatus, settings } from "@/lib/db/schema";
import { audit } from "@/lib/services/audit";
import { getSettings } from "@/lib/services/settings";

const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  businessEmail: z.string().trim().email(),
  defaultRate: dollarsToCents.refine((v) => v !== undefined && v >= 0, "Enter a rate"),
  roundingMinutes: z.coerce.number().refine((v) => [0, 6, 15, 30].includes(v), "Pick a rounding option"),
  defaultTermsDays: z.coerce.number().int().min(0).max(120),
  longTimerAlertHours: z.coerce.number().int().min(1).max(24),
});

export async function updateSettingsAction(input: z.input<typeof settingsSchema>): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const { user } = await requireAdmin();
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const before = await getSettings();
    const { defaultRate, ...rest } = parsed.data;
    await db
      .update(settings)
      .set({ ...rest, defaultRateCents: defaultRate! })
      .where(eq(settings.id, 1));
    if (before.defaultRateCents !== defaultRate || before.roundingMinutes !== rest.roundingMinutes) {
      await audit({
        actorUserId: user.id,
        action: "settings.billing_changed",
        entityType: "settings",
        metadata: {
          rate: [before.defaultRateCents, defaultRate],
          rounding: [before.roundingMinutes, rest.roundingMinutes],
        },
      });
    }
    revalidatePath("/admin", "layout");
    return ok(undefined, "Settings saved");
  });
}

export async function setRequestStatusAction(id: string, status: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = z.enum(requestStatus.enumValues).safeParse(status);
    if (!parsed.success || !z.string().uuid().safeParse(id).success) return fail("Invalid request.");
    await setRequestStatus(id, parsed.data);
    revalidatePath("/admin", "layout");
    return ok(undefined, "Request updated");
  });
}
