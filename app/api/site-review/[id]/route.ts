import { z } from "zod";

import { patchCommentSchema, preflight, withReviewer } from "@/lib/site-review/http";
import { deleteComment, updateComment } from "@/lib/site-review/service";
import type { TiptapDoc } from "@/lib/site-review/types";

export const OPTIONS = preflight;

export async function PATCH(req: Request, ctx: RouteContext<"/api/site-review/[id]">) {
  const { id } = await ctx.params;
  return withReviewer(req, async (r) => {
    const patch = patchCommentSchema.parse(await req.json());
    return updateComment(r, z.uuid().parse(id), { body: patch.body as TiptapDoc | undefined, status: patch.status });
  });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/site-review/[id]">) {
  const { id } = await ctx.params;
  return withReviewer(req, async (r) => {
    await deleteComment(r, z.uuid().parse(id));
    return { ok: true };
  });
}
