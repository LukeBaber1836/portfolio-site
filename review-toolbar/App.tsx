import { ChevronDown, Eye, EyeOff, Loader2, MessageSquarePlus, MessagesSquare, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { NewCommentInput, ReviewComment, ReviewSession } from "@/lib/site-review/types";

import { anchorFromClick, elementAt, offCenter, pinPoint, scrollToPin, whenAnchorReady, type PinPoint } from "./anchor";
import { ApiError, type Api } from "./api";
import { CommentCard, plainTextOf, timeAgo } from "./CommentCard";

const FOCUS_KEY = "lb_review_focus";
const NUDGE_KEY = "lb_review_nudge_dismissed";

type Open = { key: string; commentId: string | null; anchor: Omit<NewCommentInput, "body"> | null };

/** Re-render on scroll, resize and (cheaply) on a timer, so pins track layout shifts. */
function useFrameTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const bump = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTick((t) => t + 1));
    };
    window.addEventListener("scroll", bump, { passive: true, capture: true });
    window.addEventListener("resize", bump);
    const id = setInterval(bump, 1000);
    return () => {
      window.removeEventListener("scroll", bump, { capture: true });
      window.removeEventListener("resize", bump);
      clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, []);
}

/** location.pathname, kept current through client-side navigation (Next.js, React Router…). */
function usePathname() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const sync = () => setPath(location.pathname);
    window.addEventListener("popstate", sync);
    const id = setInterval(sync, 400);
    return () => {
      window.removeEventListener("popstate", sync);
      clearInterval(id);
    };
  }, []);
  return path;
}

export function App({ api, onExit }: { api: Api; onExit: () => void }) {
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [placing, setPlacing] = useState(false);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  const [panel, setPanel] = useState(false);
  const [scope, setScope] = useState<"page" | "all">("page");
  const [showResolved, setShowResolved] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [nudge, setNudge] = useState(() => sessionStorage.getItem(NUDGE_KEY) !== "1");
  const [flash, setFlash] = useState<string | null>(null);
  const path = usePathname();
  useFrameTick();

  /** Bring a comment on this page into view, open it, and flash its pin. */
  const reveal = useCallback(async (c: ReviewComment) => {
    setPanel(false);
    await whenAnchorReady(c);
    scrollToPin(c);
    setOpen({ key: c.id, commentId: c.id, anchor: null });
    setFlash(c.id);
    setTimeout(() => setFlash((f) => (f === c.id ? null : f)), 1600);
    // Images and fonts loading mid-scroll can push the element; correct once the smooth scroll settles.
    setTimeout(() => {
      if (offCenter(c) > 140) scrollToPin(c, "instant");
    }, 900);
  }, []);

  useEffect(() => {
    api
      .session()
      .then((s) => {
        setSession(s);
        setComments(s.comments);
        // Arrived from "open on page" in the list (or the admin feedback card).
        const focus = sessionStorage.getItem(FOCUS_KEY);
        if (focus) {
          sessionStorage.removeItem(FOCUS_KEY);
          const c = s.comments.find((x) => x.id === focus);
          if (c && c.pagePath === location.pathname) void reveal(c);
        }
      })
      .catch((err: ApiError) => setFatal(err.status === 401 ? "This review link has expired. Open it again from your client portal." : err.message));
  }, [api, reveal]);

  // Pin numbers follow creation order per page, resolved ones included, so numbers never shift.
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    const perPage = new Map<string, number>();
    for (const c of [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const n = (perPage.get(c.pagePath) ?? 0) + 1;
      perPage.set(c.pagePath, n);
      map.set(c.id, n);
    }
    return map;
  }, [comments]);

  const pageComments = comments.filter((c) => c.pagePath === path);
  const visiblePins = pageComments.filter((c) => showResolved || c.status === "open" || c.id === open?.commentId);
  const openCount = comments.filter((c) => c.status === "open").length;
  const canComment = !!session?.canComment;

  const upsert = useCallback((saved: ReviewComment) => {
    setComments((list) => (list.some((c) => c.id === saved.id) ? list.map((c) => (c.id === saved.id ? saved : c)) : [...list, saved]));
    setOpen((o) => (o && (o.commentId === saved.id || o.commentId === null) ? { ...o, commentId: saved.id } : o));
  }, []);

  const removeLocal = useCallback((id: string) => {
    setComments((list) => list.filter((c) => c.id !== id));
    setOpen((o) => (o?.commentId === id ? null : o));
  }, []);

  // Keyboard: C toggles comment mode, Esc leaves it. Ignored while typing anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.composedPath()[0] as HTMLElement | undefined;
      const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (e.key === "Escape" && placing) {
        setPlacing(false);
        setHover(null);
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "c" && canComment) {
        setOpen(null);
        setPlacing((p) => !p);
        setHover(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placing, canComment]);

  // Click anywhere on the host page (outside the toolbar) closes the open card.
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const root = hostRef.current?.getRootNode() as ShadowRoot | undefined;
      if (root && !e.composedPath().includes(root.host)) setOpen(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  function placeAt(x: number, y: number) {
    const el = elementAt(x, y);
    if (!el) return;
    setPlacing(false);
    setHover(null);
    setNudge(false);
    setOpen({ key: `draft-${Date.now()}`, commentId: null, anchor: anchorFromClick(el, x, y) });
  }

  /** List click: same page → scroll to it; other page → load that page, then scroll (see FOCUS_KEY above). */
  function goTo(c: ReviewComment) {
    if (c.pagePath !== location.pathname) {
      sessionStorage.setItem(FOCUS_KEY, c.id);
      location.assign(c.pagePath);
      return;
    }
    void reveal(c);
  }

  function dismissNudge() {
    sessionStorage.setItem(NUDGE_KEY, "1");
    setNudge(false);
  }

  if (fatal) {
    return (
      <div ref={hostRef} className="lb-root">
        <div className="lb-bar lb-bar--error" role="status">
          <span className="lb-brand">LB</span>
          <span className="lb-bar__text">{fatal}</span>
          <button type="button" className="lb-icon-btn" aria-label="Close review toolbar" onClick={onExit}>
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div ref={hostRef} className="lb-root">
        <button type="button" className="lb-fab" aria-label="Show review toolbar" onClick={() => setCollapsed(false)}>
          <span className="lb-brand">LB</span>
          {openCount > 0 && <span className="lb-fab__count">{openCount}</span>}
        </button>
      </div>
    );
  }

  const openComment = open?.commentId ? comments.find((c) => c.id === open.commentId) ?? null : null;
  const openAnchor = openComment ?? open?.anchor ?? null;
  const openPoint: PinPoint | null = openAnchor ? pinPoint(openAnchor) : null;
  const listed = (scope === "page" ? pageComments : comments).filter((c) => showResolved || c.status === "open");
  // Grouped by page (current page first), each in pin order.
  const groups = [...new Set(listed.map((c) => c.pagePath))]
    .sort((a, b) => (a === path ? -1 : b === path ? 1 : a.localeCompare(b)))
    .map((page) => ({ page, items: listed.filter((c) => c.pagePath === page).sort((a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0)) }));

  return (
    <div ref={hostRef} className="lb-root">
      {/* Pins */}
      {visiblePins.map((c) => {
        const p = pinPoint(c);
        if (p.y < -40 || p.y > window.innerHeight + 40) return null;
        const active = open?.commentId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            className={`lb-pin${c.status === "resolved" ? " lb-pin--resolved" : ""}${active ? " lb-pin--active" : ""}${p.anchored ? "" : " lb-pin--loose"}${flash === c.id ? " lb-pin--flash" : ""}`}
            style={{ transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)` }}
            aria-label={`Comment ${numbers.get(c.id)} by ${c.authorName}`}
            onClick={() => setOpen(active ? null : { key: c.id, commentId: c.id, anchor: null })}
          >
            {numbers.get(c.id)}
          </button>
        );
      })}

      {/* Draft pin (before the first save) */}
      {open && !open.commentId && openPoint && (
        <span className="lb-pin lb-pin--active lb-pin--draft" style={{ transform: `translate(${openPoint.x}px, ${openPoint.y}px) translate(-50%, -100%)` }} aria-hidden>
          +
        </span>
      )}

      {open && openPoint && session && (
        <CommentCard
          key={open.key}
          api={api}
          comment={openComment}
          anchor={open.anchor}
          number={openComment ? (numbers.get(openComment.id) ?? 0) : pageComments.length + 1}
          point={openPoint}
          viewerName={session.viewerName}
          canEdit={canComment && (!openComment || openComment.mine)}
          canDelete={canComment && (!openComment || openComment.mine || session.isAdmin)}
          isAdmin={session.isAdmin}
          onSaved={upsert}
          onDeleted={removeLocal}
          onClose={() => setOpen(null)}
        />
      )}

      {/* Comment mode: crosshair + element highlight; the click lands here, not on the site. */}
      {placing && (
        <div
          className="lb-placing"
          onPointerMove={(e) => {
            const el = elementAt(e.clientX, e.clientY);
            setHover(el ? el.getBoundingClientRect() : null);
          }}
          onClick={(e) => placeAt(e.clientX, e.clientY)}
        >
          {hover && <div className="lb-highlight" style={{ left: hover.left, top: hover.top, width: hover.width, height: hover.height }} />}
          <div className="lb-placing__hint">Click anywhere to leave a comment · Esc to cancel</div>
        </div>
      )}

      {/* Comment list */}
      {panel && (
        <aside className="lb-panel" aria-label="Comments">
          <header className="lb-panel__head">
            <div className="lb-seg" role="tablist">
              <button type="button" role="tab" aria-selected={scope === "page"} onClick={() => setScope("page")}>
                This page
              </button>
              <button type="button" role="tab" aria-selected={scope === "all"} onClick={() => setScope("all")}>
                All pages
              </button>
            </div>
            <button type="button" className="lb-icon-btn" aria-label="Close comments" onClick={() => setPanel(false)}>
              <X size={16} />
            </button>
          </header>
          <button type="button" className="lb-panel__toggle" onClick={() => setShowResolved((v) => !v)}>
            {showResolved ? <EyeOff size={14} /> : <Eye size={14} />} {showResolved ? "Hide resolved" : "Show resolved"}
          </button>
          {listed.length === 0 ? (
            <p className="lb-panel__empty">
              {canComment ? "No comments yet. Press Comment, then click anything on the page." : "No comments on this project."}
            </p>
          ) : (
            <div className="lb-panel__list">
              {groups.map(({ page, items }) => (
                <section key={page} className="lb-group">
                  {scope === "all" && (
                    <h3 className="lb-group__head">
                      <span className="lb-item__path">{page}</span>
                      {page === path && <span className="lb-group__here">this page</span>}
                    </h3>
                  )}
                  <ol className="lb-group__list">
                    {items.map((c) => (
                      <li key={c.id}>
                        <button type="button" className={`lb-item${c.status === "resolved" ? " lb-item--resolved" : ""}`} onClick={() => goTo(c)}>
                          <span className="lb-pin lb-pin--static">{numbers.get(c.id)}</span>
                          <span className="lb-item__body">
                            <span className="lb-item__meta">
                              {c.authorName} · {timeAgo(c.createdAt)}
                            </span>
                            <span className="lb-item__text">{plainTextOf(c.body)}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* Review-stage nudge */}
      {session?.awaitingReview && canComment && nudge && !placing && !open && !comments.some((c) => c.mine) && (
        <div className="lb-nudge" role="status">
          <p className="lb-nudge__text">
            <strong>Your review is needed.</strong> Press <em>Comment</em>, then click anything on the page to tell me what you&apos;d like changed —
            wording, images, layout.
          </p>
          <button type="button" className="lb-icon-btn" aria-label="Dismiss" onClick={dismissNudge}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="lb-bar" role="toolbar" aria-label="Site review">
        <span className="lb-brand" title={session ? `Reviewing ${session.projectName}` : "Site review"}>
          LB
        </span>
        <span className="lb-bar__title">{session ? session.projectName : <Loader2 size={14} className="lb-spin" />}</span>
        <span className="lb-bar__sep" />
        {canComment && (
          <button
            type="button"
            className={`lb-btn${placing ? " lb-btn--active" : " lb-btn--gold"}${session?.awaitingReview ? " lb-btn--pulse" : ""}`}
            aria-pressed={placing}
            onClick={() => {
              setOpen(null);
              setPlacing((p) => !p);
            }}
          >
            <MessageSquarePlus size={15} /> {placing ? "Cancel" : "Comment"}
            <kbd>C</kbd>
          </button>
        )}
        <button type="button" className="lb-btn lb-btn--ghost" aria-pressed={panel} onClick={() => setPanel((v) => !v)}>
          <MessagesSquare size={15} /> {openCount}
        </button>
        <span className="lb-bar__sep" />
        <button type="button" className="lb-icon-btn" aria-label="Minimize toolbar" title="Minimize" onClick={() => setCollapsed(true)}>
          <ChevronDown size={16} />
        </button>
        <button type="button" className="lb-icon-btn" aria-label="Exit review mode" title="Exit review mode" onClick={onExit}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
