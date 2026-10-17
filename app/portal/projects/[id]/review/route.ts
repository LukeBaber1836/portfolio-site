import { notFound, redirect } from "next/navigation";

import { requireClient } from "@/lib/auth/guards";
import { portalProject } from "@/lib/dal/portal";
import { reviewLaunchUrl } from "@/lib/site-review/launch";

// Pencil button on the portal site hero → the client's site with the review toolbar switched on.
export async function GET(req: Request, ctx: RouteContext<"/portal/projects/[id]/review">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { user } = await requireClient();
  const data = await portalProject(id);
  if (!data) notFound();
  const search = new URL(req.url).searchParams;
  const url = reviewLaunchUrl(data.project, user.id, { site: search.get("site"), path: search.get("path"), focus: search.get("focus") });
  if (!url) redirect(`/portal/projects/${id}`);
  redirect(url);
}
