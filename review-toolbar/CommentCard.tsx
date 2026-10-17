import { Check, CircleCheck, Loader2, MoreHorizontal, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { NewCommentInput, ReviewComment, TiptapDoc } from "@/lib/site-review/types";

import type { PinPoint } from "./anchor";
import type { Api } from "./api";
import { EditorContent, FormatBar, isEmptyDoc, useCommentEditor } from "./Editor";

const CARD_W = 320;
const GAP = 18;

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type SaveState = { kind: "idle" | "saving" | "saved" } | { kind: "error"; message: string };

/**
 * One comment, open next to its pin. New and own comments are edited in place and autosave:
 * 800 ms after typing stops, and again when the card closes (click away, Esc, ×). A new comment
 * left empty is simply discarded. Saves run one at a time so the first save's id is never raced.
 */
export function CommentCard({
  api,
  comment,
  anchor,
  number,
  point,
  viewerName,
  canEdit,
  isAdmin,
  onSaved,
  onDeleted,
  onClose,
}: {
  api: Api;
  comment: ReviewComment | null;
  anchor: Omit<NewCommentInput, "body"> | null;
  number: number;
  point: PinPoint;
  viewerName: string;
  canEdit: boolean;
  isAdmin: boolean;
  onSaved: (c: ReviewComment) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const idRef = useRef(comment?.id ?? null);
  // Mirrors idRef for rendering (refs can't be read during render).
  const [savedId, setSavedId] = useState(comment?.id ?? null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [menu, setMenu] = useState<"closed" | "open" | "confirm-delete">("closed");
  const [busy, setBusy] = useState(false);

  const editor = useCommentEditor({
    content: comment?.body ?? null,
    editable: canEdit,
    onChange: () => {
      dirty.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flushRef.current(), 800);
    },
  });

  const flush = (): Promise<void> => {
    clearTimeout(timer.current);
    if (!dirty.current || !editor || isEmptyDoc(editor)) return queue.current;
    dirty.current = false;
    const body = editor.getJSON() as TiptapDoc;
    queue.current = queue.current.then(async () => {
      setSave({ kind: "saving" });
      try {
        const saved = idRef.current ? await api.update(idRef.current, { body }) : await api.create({ ...anchor!, body });
        idRef.current = saved.id;
        setSavedId(saved.id);
        onSaved(saved);
        setSave({ kind: "saved" });
      } catch (err) {
        dirty.current = true;
        setSave({ kind: "error", message: (err as Error).message });
      }
    });
    return queue.current;
  };
  const flushRef = useRef(flush);
  useLayoutEffect(() => {
    flushRef.current = flush;
  });

  // Closing (or switching to another pin) unmounts the card: save whatever is pending.
  useEffect(() => () => void flushRef.current(), []);

  // Esc closes from anywhere inside the card.
  const close = () => {
    void flush();
    onClose();
  };

  async function remove() {
    if (!idRef.current) return onClose();
    setBusy(true);
    try {
      clearTimeout(timer.current);
      dirty.current = false;
      await queue.current;
      await api.remove(idRef.current);
      onDeleted(idRef.current);
    } catch (err) {
      setBusy(false);
      setSave({ kind: "error", message: (err as Error).message });
    }
  }

  async function setStatus(status: "open" | "resolved") {
    if (!idRef.current) return;
    setBusy(true);
    try {
      onSaved(await api.update(idRef.current, { status }));
      setMenu("closed");
    } catch (err) {
      setSave({ kind: "error", message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  // Measure the card so it can be kept on screen.
  const cardRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(200);
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_W, vw - 24);
  const right = point.x + GAP + width <= vw - 12;
  const left = right ? point.x + GAP : Math.max(12, point.x - GAP - width);
  const top = Math.min(Math.max(12, point.y - 28), Math.max(12, vh - height - 12));

  const isNew = !savedId;
  const author = comment?.authorName ?? viewerName;
  const resolved = comment?.status === "resolved";
  const canManage = !!comment && (comment.mine || isAdmin);

  return (
    <div
      ref={cardRef}
      className={`lb-card${resolved ? " lb-card--resolved" : ""}`}
      style={{ left, top, width }}
      role="dialog"
      aria-label={isNew ? "New comment" : `Comment ${number} by ${author}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
    >
      <header className="lb-card__head">
        <span className="lb-pin lb-pin--static" aria-hidden>
          {number}
        </span>
        <div className="lb-card__who">
          <span className="lb-card__author">
            {author}
            {comment?.fromAdmin && <span className="lb-tag">Developer</span>}
          </span>
          <span className="lb-card__meta">
            {comment ? timeAgo(comment.createdAt) : "New comment"}
            {resolved && (
              <span className="lb-card__resolved">
                <CircleCheck size={12} /> Resolved
              </span>
            )}
          </span>
        </div>
        {canManage && (
          <button type="button" className="lb-icon-btn" aria-label="More actions" aria-expanded={menu !== "closed"} onClick={() => setMenu((m) => (m === "closed" ? "open" : "closed"))}>
            <MoreHorizontal size={16} />
          </button>
        )}
        <button type="button" className="lb-icon-btn" aria-label="Close" onClick={close}>
          <X size={16} />
        </button>
      </header>

      {menu === "open" && (
        <div className="lb-menu" role="menu">
          {isAdmin && (
            <button type="button" role="menuitem" className="lb-menu__item" disabled={busy} onClick={() => setStatus(resolved ? "open" : "resolved")}>
              {resolved ? <RotateCcw size={14} /> : <Check size={14} />} {resolved ? "Reopen" : "Mark resolved"}
            </button>
          )}
          <button type="button" role="menuitem" className="lb-menu__item lb-menu__item--danger" onClick={() => setMenu("confirm-delete")}>
            <Trash2 size={14} /> Delete comment
          </button>
        </div>
      )}
      {menu === "confirm-delete" && (
        <div className="lb-confirm">
          <p>Delete this comment? This can&apos;t be undone.</p>
          <div className="lb-confirm__actions">
            <button type="button" className="lb-btn lb-btn--small lb-btn--ghost" onClick={() => setMenu("closed")}>
              Cancel
            </button>
            <button type="button" className="lb-btn lb-btn--small lb-btn--danger" disabled={busy} onClick={remove}>
              {busy ? <Loader2 size={14} className="lb-spin" /> : <Trash2 size={14} />} Delete
            </button>
          </div>
        </div>
      )}

      <div className={`lb-editor${canEdit ? " lb-editor--editable" : ""}`}>
        <EditorContent editor={editor} />
      </div>

      {canEdit && editor && (
        <footer className="lb-card__foot">
          <FormatBar editor={editor} />
          <span className={`lb-save lb-save--${save.kind}`} aria-live="polite">
            {save.kind === "saving" && (
              <>
                <Loader2 size={12} className="lb-spin" /> Saving…
              </>
            )}
            {save.kind === "saved" && (
              <>
                <Check size={12} /> Saved
              </>
            )}
            {save.kind === "error" && save.message}
            {save.kind === "idle" && (isNew ? "Saves as you type" : "")}
          </span>
        </footer>
      )}
    </div>
  );
}

export function plainTextOf(doc: TiptapDoc | undefined): string {
  const walk = (n: unknown): string => {
    const node = n as { type?: string; text?: string; content?: unknown[] };
    if (!node) return "";
    if (node.type === "text") return node.text ?? "";
    return (node.content ?? []).map(walk).join(" ");
  };
  return walk(doc).replace(/\s+/g, " ").trim();
}
