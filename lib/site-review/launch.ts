import "server-only";

import type { Project } from "@/lib/db/schema";
import { featuredSiteOf } from "@/lib/references/preview";
import { createReviewToken } from "@/lib/site-review/token";
import { REVIEW_HASH_PARAM } from "@/lib/site-review/types";

/**
 * The URL that opens a project's site with the review toolbar switched on. The token rides in the
 * fragment so it never reaches the site's server logs or a Referer header; the loader strips it.
 */
export function reviewLaunchUrl(
  project: Pick<Project, "id" | "productionUrl" | "devUrl" | "featuredSite">,
  userId: string,
  opts: { site?: string | null; path?: string | null; focus?: string | null } = {},
) {
  const site =
    opts.site === "dev" ? (project.devUrl ?? project.productionUrl) : opts.site === "production" ? (project.productionUrl ?? project.devUrl) : featuredSiteOf(project)?.url;
  if (!site) return null;
  const url = new URL(site);
  // Only same-site paths — this is a redirect target.
  if (opts.path?.startsWith("/") && !opts.path.startsWith("//")) url.pathname = opts.path;
  url.hash = `${REVIEW_HASH_PARAM}=${createReviewToken(project.id, userId)}`;
  // Opens that comment once the toolbar loads (admin feedback card → "Open on site").
  if (opts.focus && /^[0-9a-f-]{36}$/.test(opts.focus)) url.hash += `&lb_focus=${opts.focus}`;
  return url.toString();
}
