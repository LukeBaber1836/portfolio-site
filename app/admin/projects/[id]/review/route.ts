import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/guards";
import { getProjectSites } from "@/lib/dal/admin/site-comments";
import { reviewLaunchUrl } from "@/lib/site-review/launch";

// "Open on site" from the admin feedback card — same toolbar the client sees, with resolve controls.
export async function GET(req: Request, ctx: RouteContext<"/admin/projects/[id]/review">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { user } = await requireAdmin();
  const project = await getProjectSites(id);
  if (!project) notFound();
  const search = new URL(req.url).searchParams;
  const url = reviewLaunchUrl(project, user.id, { site: search.get("site"), path: search.get("path"), focus: search.get("focus") });
  if (!url) redirect(`/admin/projects/${id}`);
  redirect(url);
}
