// Shared by the review API (app/api/site-review) and the toolbar bundle (review-toolbar/).
// Keep this file free of server-only imports — esbuild bundles it into the client's site.

export type Viewport = "desktop" | "tablet" | "mobile";

export type TiptapDoc = { type: "doc"; content?: unknown[] };

export type ReviewComment = {
  id: string;
  authorName: string;
  fromAdmin: boolean;
  mine: boolean;
  pagePath: string;
  selector: string | null;
  offsetX: number | null;
  offsetY: number | null;
  docX: number;
  docY: number;
  viewport: Viewport;
  body: TiptapDoc;
  status: "open" | "resolved";
  createdAt: string;
  updatedAt: string;
};

export type ReviewSession = {
  projectName: string;
  viewerName: string;
  isAdmin: boolean;
  /** Project is in the "Your review" stage — the toolbar nudges the client to leave feedback. */
  awaitingReview: boolean;
  /** Completed/cancelled projects are read-only. */
  canComment: boolean;
  comments: ReviewComment[];
};

export type NewCommentInput = {
  pagePath: string;
  selector: string | null;
  offsetX: number | null;
  offsetY: number | null;
  docX: number;
  docY: number;
  viewport: Viewport;
  body: TiptapDoc;
};

export const REVIEW_HASH_PARAM = "lb_review";
