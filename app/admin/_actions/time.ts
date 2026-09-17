"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, fromZodError, ok, runAction, type ActionResult } from "@/lib/actions";
import {
  createManualEntry,
  deleteEntry,
  discardTimer,
  setEntriesBillable,
  startTimer,
  stopTimer,
  updateEntry,
} from "@/lib/dal/admin/time";

function refreshTimeViews() {
  revalidatePath("/admin", "layout");
}

export async function startTimerAction(input: { projectId: string; description?: string }): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = z
      .object({ projectId: z.string().uuid("Pick a project"), description: z.string().trim().max(500).optional() })
      .safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const entry = await startTimer(parsed.data.projectId, parsed.data.description || undefined);
    refreshTimeViews();
    return ok({ id: entry.id }, "Clocked in");
  });
}

const stopSchema = z.object({
  description: z.string().trim().min(3, "Add a short description of what you worked on").max(2000),
  billable: z.boolean(),
});

export async function stopTimerAction(input: z.input<typeof stopSchema>): Promise<ActionResult<{ seconds: number }>> {
  return runAction(async () => {
    const parsed = stopSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const entry = await stopTimer(parsed.data);
    refreshTimeViews();
    return ok({ seconds: entry.durationSeconds ?? 0 }, "Time saved");
  });
}

export async function discardTimerAction(): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await discardTimer();
    refreshTimeViews();
    return ok(undefined, "Timer discarded");
  });
}

const entrySchema = z.object({
  projectId: z.string().uuid("Pick a project"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time required"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time required"),
  description: z.string().trim().min(3, "Add a short description").max(2000),
  billable: z.boolean(),
});

export async function saveEntryAction(id: string | null, input: z.input<typeof entrySchema>): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = entrySchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    if (id) await updateEntry(id, parsed.data);
    else await createManualEntry(parsed.data);
    refreshTimeViews();
    return ok(undefined, id ? "Entry updated" : "Entry added");
  });
}

export async function deleteEntryAction(id: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    if (!z.string().uuid().safeParse(id).success) return fail("Invalid entry.");
    await deleteEntry(id);
    refreshTimeViews();
    return ok(undefined, "Entry deleted");
  });
}

export async function setBillableAction(ids: string[], billable: boolean): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const parsed = z.array(z.string().uuid()).max(500).safeParse(ids);
    if (!parsed.success) return fail("Invalid selection.");
    const count = await setEntriesBillable(parsed.data, billable);
    refreshTimeViews();
    return ok({ count }, `${count} ${count === 1 ? "entry" : "entries"} marked ${billable ? "billable" : "no charge"}`);
  });
}
