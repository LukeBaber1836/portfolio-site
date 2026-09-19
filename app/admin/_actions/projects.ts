"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { dollarsToCents, fail, fromZodError, ok, optionalText, runAction, type ActionResult } from "@/lib/actions";
import {
  addMilestone,
  createProject,
  createReference,
  deleteMilestone,
  deleteProjectUpdate,
  deleteReference,
  reorderMilestones,
  postProjectUpdate,
  quickUpdateProject,
  setMilestoneStatus,
  updateMilestone,
  updateProject,
} from "@/lib/dal/admin/projects";
import { milestoneStatus, projectStatus, serviceType } from "@/lib/db/schema";

const optionalDate = z
  .string()
  .transform((v) => (v === "" ? undefined : v))
  .refine((v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date")
  .optional();

const projectSchema = z
  .object({
    clientId: z.string().uuid("Pick a client"),
    name: z.string().trim().min(2, "Name the project").max(120),
    description: optionalText,
    serviceType: z.enum(serviceType.enumValues),
    status: z.enum(projectStatus.enumValues),
    billingType: z.enum(["hourly", "fixed"]),
    rate: dollarsToCents.optional(),
    fixedPrice: dollarsToCents.optional(),
    budgetHours: z
      .union([z.string(), z.number()])
      .transform((v) => (v === "" ? undefined : Number(v)))
      .refine((v) => v === undefined || (Number.isInteger(v) && v > 0 && v < 10000), "Whole hours only")
      .optional(),
    progressPct: z.coerce.number().int().min(0).max(100),
    startDate: optionalDate,
    dueDate: optionalDate,
    clientVisible: z.boolean(),
  })
  .refine((p) => !(p.startDate && p.dueDate && p.dueDate < p.startDate), {
    message: "Due date must be after the start date",
    path: ["dueDate"],
  });

export type ProjectFormInput = z.input<typeof projectSchema>;

function toInput(data: z.output<typeof projectSchema>) {
  const { rate, fixedPrice, ...rest } = data;
  return { ...rest, rateCents: rate, fixedPriceCents: fixedPrice };
}

export async function createProjectAction(input: ProjectFormInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const project = await createProject(toInput(parsed.data));
    revalidatePath("/admin", "layout");
    return ok({ id: project.id }, "Project created" + project.storageNotice);
  });
}

export async function updateProjectAction(id: string, input: ProjectFormInput): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const { clientId: _clientId, ...rest } = toInput(parsed.data);
    await updateProject(id, rest);
    revalidatePath("/admin", "layout");
    return ok(undefined, "Project saved");
  });
}

export async function quickUpdateProjectAction(
  id: string,
  patch: { status?: string; progressPct?: number },
): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = z
      .object({ status: z.enum(projectStatus.enumValues).optional(), progressPct: z.number().int().min(0).max(100).optional() })
      .safeParse(patch);
    if (!parsed.success) return fail("Invalid update.");
    await quickUpdateProject(id, parsed.data);
    revalidatePath("/admin", "layout");
    return ok(undefined);
  });
}

export async function postUpdateAction(projectId: string, input: { body: string; notify: boolean }): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = z.object({ body: z.string().trim().min(5, "Write a few words").max(5000), notify: z.boolean() }).safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const { emailNotice } = await postProjectUpdate(projectId, parsed.data.body, parsed.data.notify);
    revalidatePath(`/admin/projects/${projectId}`);
    const base = parsed.data.notify ? "Update posted and emailed" : "Update posted";
    return ok(undefined, base + emailNotice);
  });
}

export async function deleteUpdateAction(projectId: string, id: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await deleteProjectUpdate(id);
    revalidatePath(`/admin/projects/${projectId}`);
    return ok(undefined, "Update deleted");
  });
}

const milestoneSchema = z.object({
  title: z.string().trim().min(2, "Name the milestone").max(160),
  dueDate: optionalDate,
  description: optionalText,
});

export async function saveMilestoneAction(
  projectId: string,
  id: string | null,
  input: z.input<typeof milestoneSchema>,
): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = milestoneSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    if (id) await updateMilestone(id, parsed.data);
    else await addMilestone(projectId, parsed.data);
    revalidatePath(`/admin/projects/${projectId}`);
    return ok(undefined, id ? "Milestone saved" : "Milestone added");
  });
}

export async function setMilestoneStatusAction(projectId: string, id: string, status: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = z.enum(milestoneStatus.enumValues).safeParse(status);
    if (!parsed.success) return fail("Invalid status.");
    await setMilestoneStatus(id, parsed.data);
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/portal/projects/${projectId}`, "page");
    return ok(undefined, parsed.data === "done" ? "Milestone complete" : undefined);
  });
}

export async function reorderMilestonesAction(projectId: string, orderedIds: string[]): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = z.array(z.string().uuid()).max(200).safeParse(orderedIds);
    if (!parsed.success) return fail("Invalid order.");
    await reorderMilestones(projectId, parsed.data);
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/portal/projects/${projectId}`, "page");
    return ok(undefined);
  });
}

export async function deleteMilestoneAction(projectId: string, id: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await deleteMilestone(id);
    revalidatePath(`/admin/projects/${projectId}`);
    return ok(undefined, "Milestone deleted");
  });
}

const referenceSchema = z
  .object({
    url: z.string().trim().max(2000).optional(),
    title: z.string().trim().max(160).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.url?.trim() || d.note?.trim(), {
    message: "Add a link or a note",
    path: ["url"],
  });

export async function sendReferenceAction(
  projectId: string,
  input: z.input<typeof referenceSchema>,
): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const parsed = referenceSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    await createReference(projectId, parsed.data);
    revalidatePath(`/admin/projects/${projectId}`);
    // The portal project page is cached per route — without this, clients keep
    // seeing the pre-share version until a hard refresh.
    revalidatePath(`/portal/projects/${projectId}`, "page");
    return ok(undefined, "Reference shared");
  });
}

export async function deleteReferenceAction(projectId: string, id: string): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    await deleteReference(id);
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/portal/projects/${projectId}`, "page");
    return ok(undefined, "Reference deleted");
  });
}
