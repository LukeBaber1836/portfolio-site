import { newCommentSchema, preflight, withReviewer } from "@/lib/site-review/http";
import { createComment, reviewSession } from "@/lib/site-review/service";
import type { NewCommentInput } from "@/lib/site-review/types";

// Review toolbar API (see public/review/loader.js): session + comments, and creating comments.

export const OPTIONS = preflight;

export async function GET(req: Request) {
  return withReviewer(req, (r) => reviewSession(r));
}

export async function POST(req: Request) {
  return withReviewer(req, async (r) => createComment(r, newCommentSchema.parse(await req.json()) as NewCommentInput));
}
