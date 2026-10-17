import type { NewCommentInput, ReviewComment, ReviewSession, TiptapDoc } from "@/lib/site-review/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type Api = ReturnType<typeof createApi>;

export function createApi(origin: string, token: string) {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${origin}/api/site-review${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError("You look offline. Changes will save when you reconnect.", 0);
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new ApiError(data.error ?? "Something went wrong. Please try again.", res.status);
    return data as T;
  }

  return {
    session: () => call<ReviewSession>("GET", ""),
    create: (input: NewCommentInput) => call<ReviewComment>("POST", "", input),
    update: (id: string, patch: { body?: TiptapDoc; status?: "open" | "resolved" }) => call<ReviewComment>("PATCH", `/${id}`, patch),
    remove: (id: string) => call<{ ok: true }>("DELETE", `/${id}`),
  };
}
