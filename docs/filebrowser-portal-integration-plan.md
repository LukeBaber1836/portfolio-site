# FileBrowser → Client Portal Upload Dropbox

> Status: **Implemented (rev 3)** · Date: 2026-09-15 · Remaining: storage-host setup (§2) + production rollout (§11)
> Author: Muse Spark (with Luke Baber) · Validated, revised & implemented by Claude (see §12)
> Source: `https://github.com/gtsteffaniak/filebrowser` (FileBrowser Quantum), running at `storage.lukebaber.com`

The live instance is **FileBrowser Quantum v1.5.x (stable)**: its login-page config keys match `1.5.6-stable` and not `2.0.6-beta`, and the version string is hidden. The integration was tested end to end against **both** `gtstef/filebrowser:1.5.6-stable-slim` and `2.0.6-beta-slim`, and behaves the same on each (§7).

---

## 0. What it does

`/portal/files` is an **upload dropbox**:

1. Client picks the **project**. This step is skipped when there's only one.
2. Client drags and drops, or taps to browse. Each file is routed to pictures/videos/files by its type — nothing to pick.
3. Files upload straight to `storage.lukebaber.com` with per-file progress, then show up in the folder browser below, where they can be renamed or deleted.

Storage layout, created automatically inside the service account's scope (`/Documents/Freelancing`):

```
{client-folder}/                ← clients.storage_path (auto: the client's company or name); created on client create
└── {project-folder}/           ← projects.storage_folder (auto: the project's name); created on project create
    ├── pictures/
    ├── videos/
    └── files/
```

Folder names are kept readable (spaces and capitals as typed, path-breaking characters replaced). A name already
taken by another client/project of the same client gets a ` (id6)` suffix. Admins can override either name.

- File bytes go **browser → storage directly**. Vercel only handles tiny JSON (folder creation, link minting).
- The FileBrowser service token never reaches the browser. The browser only receives a per-folder, upload-only share hash.
- No confirmation email on upload.
- If `FILEBROWSER_API_TOKEN` is unset, the page falls back to the old "Open file storage" card.
- Clients with their own `storage_username` also see a secondary "Browse your files" card under the dropbox.

---

## 1. Architecture

```
Lane 1 (JSON via Vercel, service token server-side only):
  browser → Server Action getUploadTargetAction → storage.lukebaber.com/api/{resources,share}

Lane 2 (bytes direct):
  browser → storage.lukebaber.com/public/api/resources?hash=…&path=… (XHR, chunked)
```

- `requireClient()` resolves the client from the session. The browser sends `projectId` + `kind`, and the DAL only accepts projects belonging to that client with `client_visible = true` and a status other than `completed`/`cancelled`.
- There is one upload share per **(project, kind)**. It is created lazily, lasts **7 days**, and is rotated when less than 24 h remain. It is revoked on:
  - client archive
  - contact removal
  - project hidden or closed
  - client storage-path change
- A share hash is a bearer secret for **uploading into one folder**. Upload shares can't list, download, or preview (verified: `501`).

---

## 2. Storage host setup (Luke — do this before deploying)

### 2.1 Caddy

FileBrowser has no CORS setting, and a live preflight currently returns `405`. Add the block below **inside your existing `storage.lukebaber.com { … }` site block**, and wrap your current `reverse_proxy` in `handle { }`. Replace `localhost:8080` with whatever upstream you proxy to today, keeping any options you already have.

```caddy
storage.lukebaber.com {
	# ── Client portal uploads (lukebaber.com → FileBrowser upload shares) ──
	handle /public/api/resources {
		@portal_origin header_regexp Origin ^https://(www\.)?lukebaber\.com$

		header @portal_origin {
			Access-Control-Allow-Origin "{http.request.header.Origin}"
			Access-Control-Allow-Methods "POST, OPTIONS"
			Access-Control-Allow-Headers "Content-Type, X-File-Chunk-Offset, X-File-Total-Size, X-File-Upload-Session"
			Access-Control-Max-Age "86400"
			Vary "Origin"
		}

		@portal_preflight {
			method OPTIONS
			header_regexp Origin ^https://(www\.)?lukebaber\.com$
		}
		respond @portal_preflight 204

		reverse_proxy localhost:8080 {
			# Required: without buffering, Caddy hangs when FileBrowser rejects a
			# large chunk early (expired link 404 / name conflict 409).
			request_buffers 16MiB
		}
	}

	handle {
		reverse_proxy localhost:8080   # ← your existing proxy config
	}
}
```

- To test uploads from `next dev`, temporarily change both regexes to `^(https://(www\.)?lukebaber\.com|http://localhost:3000)$`.
- Apply with `caddy validate --config /etc/caddy/Caddyfile` then `caddy reload --config /etc/caddy/Caddyfile` (or `systemctl reload caddy`).
- `request_buffers` must stay ≥ the upload chunk size (10 MiB, `UPLOAD_CHUNK_BYTES`). It costs up to 16 MiB of RAM per in-flight portal upload request.

Verify from any machine:

```bash
# 1. Preflight from the portal origin → 204 + Access-Control-Allow-Origin
curl -si -X OPTIONS "https://storage.lukebaber.com/public/api/resources?hash=x" \
  -H "Origin: https://lukebaber.com" -H "Access-Control-Request-Method: POST" | grep -iE "^HTTP|access-control"

# 2. Other origins get nothing → 405, no Access-Control headers
curl -si -X OPTIONS "https://storage.lukebaber.com/public/api/resources?hash=x" \
  -H "Origin: https://lukebaber.com.evil.com" -H "Access-Control-Request-Method: POST" | grep -iE "^HTTP|access-control"

# 3. Buffering works: a 10 MB body to a bad hash returns 404 immediately (not a hang)
head -c 10485760 /dev/urandom > /tmp/ten.bin
curl -s -m 15 -o /dev/null -w "%{http_code} %{time_total}s\n" -X POST \
  "https://storage.lukebaber.com/public/api/resources?hash=nope&path=t.bin" --data-binary @/tmp/ten.bin
```

### 2.2 FileBrowser service account

In the FileBrowser UI, signed in as your admin:

1. **Settings → User Management → New user** `portal-service`:
   - long random password (store it in your password manager only)
   - scope `/` on your source
   - permissions **Create**, **Share**, **API** (no Admin, Modify, Delete, or Download)
2. Log in as `portal-service` → **Settings → API Tokens** → create a token named `portal`, 365 days, permissions **api, share**. Copy it.
3. Note the **source name**: the first path segment after `/files/` in any FileBrowser URL (e.g. `/files/srv/...` → `srv`), or Settings → Sources.
4. Make sure the source's disk has room for client videos, and add a disk-usage alert. FileBrowser has no quotas.

### 2.3 Environment (Vercel Production + Preview, and `.env.local` if testing locally)

```
FILEBROWSER_API_TOKEN=<portal token from 2.2>
FILEBROWSER_SOURCE=<source name from 2.2>
STORAGE_URL=https://storage.lukebaber.com   # already the default
```

---

## 3. Provisioning & share lifecycle (implemented)

| Trigger | Code | Behavior |
|---|---|---|
| Client created | `createClient()` → `provisionStorage({ client })` | Sets `storage_path` if blank, then creates the folder. Non-fatal: if storage is unreachable the admin sees a notice and the folder is created on first upload |
| Project created | `createProject()` → `provisionStorage({ client, project })` | Sets `storage_folder` and creates `{root}/{folder}/{pictures,videos,files}` (FileBrowser creates missing parents) |
| Upload link requested | `portalUploadTarget()` → `getOrRotateShare()` | Reuses the live share, or re-ensures folders and mints a new one. Concurrent mints converge on one row, and the loser's share is deleted |
| Browser gets 404 (link deleted/expired) | action with `staleHash` | Server replaces that hash if it's still current. Parallel uploads reuse the replacement instead of rotating again |
| Client archived / contact removed / storage path changed | `revokeUploadShares({ clientId })` | Deletes rows + FileBrowser shares. Never throws; audited |
| Project hidden or completed/cancelled (full edit or quick status) | `revokeUploadShares({ projectIds })` | Same |

- Existing clients and projects need no migration step: folders and links are created on the first upload.
- Admin-entered `storagePath` is normalized: trims slashes/whitespace, rejects `.`/`..` segments, backslashes, and control characters. Case and spaces are allowed so existing hand-made paths keep working. Changing it does **not** move existing files.
- Renaming a project never changes its folder.
- Audit actions:
  - `client.storage_provisioned`
  - `project.storage_provisioned`
  - `{client|project}.storage_provision_failed`
  - `project.upload_links_revoked`

---

## 4. Data model (migration `drizzle/0001_portal_upload_dropbox.sql`)

- enum `upload_kind` (`pictures`, `videos`, `files`)
- `clients.storage_provisioned_at timestamptz`
- `projects.storage_folder text`
- `projects.storage_provisioned_at timestamptz`
- `project_upload_shares (project_id fk → projects on delete cascade, kind, hash, expires_at, created_at, pk(project_id, kind))`

Applied to the Neon **dev** branch. **Not yet applied to production** (§11).

---

## 5. Code map

| File | Role |
|---|---|
| `lib/env.ts` | `FILEBROWSER_API_TOKEN` (optional), `FILEBROWSER_SOURCE` (default `srv`) |
| `lib/storage/paths.ts` (+ test) | Pure path builders: `slugify`, `normalizeStoragePath`, `defaultClientStoragePath`, `projectFolderName`, `projectKindPath` |
| `lib/storage/filebrowser.ts` | `server-only` FileBrowser client: folders, shares, rotation, revocation, `provisionStorage` |
| `lib/upload/kinds.ts` (+ test) | Shared rules: kinds, accept lists, blocked extensions, 5 GB cap, 10 MiB chunks, rename numbering, `projectAcceptsUploads` |
| `lib/upload/uploader.ts` | Browser uploader: XHR progress, chunking, 409 → "name (n).ext", 404 → fresh link, retry with backoff, 30 s stall watchdog |
| `lib/dal/portal.ts` | `portalUploadProjects()`, `portalUploadTarget()` |
| `app/portal/_actions.ts` | `getUploadTargetAction({ projectId, kind, staleHash? })` |
| `components/portal/UploadDropbox.tsx` | Dropbox UI |
| `components/portal/FilesPanel.tsx` | Adds `secondary` "Browse your files" variant |
| `app/portal/files/page.tsx` | Renders dropbox (+ secondary panel) or the legacy panel |
| `lib/dal/admin/clients.ts`, `lib/dal/admin/projects.ts`, `app/admin/_actions/*` | Provision + revoke hooks, `storagePath` validation |
| `components/admin/ClientForm.tsx` | Folder path hint |

---

## 6. Frontend behavior (implemented)

- **Steps:** project select → kind radio cards (arrow keys, `aria-checked`) → drop zone. The URL keeps `?project=&type=` via `history.replaceState` (no server round trip).
- **Drop zone:**
  - disabled until a kind is chosen; tapping or dropping shakes it
  - drag-over highlight
  - tap-to-browse through a hidden `<input type="file" multiple accept=…>`
  - folders are skipped with a note
- **File checks (client-side UX only):**
  - executables blocked
  - over 5 GB rejected
  - wrong kind (e.g. a PDF on Pictures) offers "Upload as Files"
- **Queue:**
  - 2 concurrent uploads
  - each item keeps the project/kind it was dropped with
  - rows show progress, "Uploaded as “logo (1).png”" when renamed, and errors with Retry/Remove
  - Cancel aborts
  - "Clear finished"
  - Sonner toast when a batch completes
  - `beforeunload` guard while uploading

---

## 7. FileBrowser API facts (verified on 1.5.6-stable **and** 2.0.6-beta)

| Call | Result |
|---|---|
| `POST /api/resources?source=&path=/a/b/c&isDir=true` | `200`, creates missing parents · `409` if it exists · `../` is sanitized to stay inside the source |
| `POST /api/share` `{source, path, shareType:"upload", expires:"7", unit:"days", title}` | `200` JSON with `hash`, `expire` (unix s) · `403 path not found` if the folder is missing · `unit` accepts `seconds`/`minutes`/`hours`/`days` |
| `DELETE /api/share?hash=` | `200` · already gone → `400 share not found` (treated as success) |
| `POST /public/api/resources?hash=&path=name` (raw body) | `200` · existing name → `409` · **`action=rename` is ignored on both versions** (portal renames itself) · `action=override` → `403` · `../` → `400` · unknown/expired/deleted hash → `404` · nested `path=a/b.jpg` creates subfolders |
| Chunked: headers `X-File-Chunk-Offset`, `X-File-Total-Size`, `X-File-Upload-Session` | Assembles correctly (sha256 verified, 25–30 MB). v1 returns an empty body; v2 returns `{offset,total,complete}` · 409 conflict is checked on offset 0 only |
| `GET`/download via upload-share hash | `501` (browsing/downloads disabled) |
| API token from `POST /api/auth/token?name=&days=&permissions=api,share` | Works for folder + share creation for a non-admin user with Create + Share |
| `POST /api/users` (not used) | Password-login actors must send `X-Password`; v1 body key is `data`, v2 is `user` |

Notes:

- **Abandoned chunked uploads** leave `*.uploading.tmp` files **inside the target folder** (v1). Clean them up periodically (e.g. `find /srv/clients -name '*.uploading.tmp' -mtime +2 -delete`).
- CORS is not authentication: a non-browser client with a valid hash can upload without an `Origin` header. The hash is the credential.
- The existing "Open file storage" deep link is `${STORAGE_URL}/files/{storage_path}/`. FileBrowser Quantum URLs are `/files/{source}/{path}`, so check the link opens the right folder, or include the source name in `storage_path`'s deep link.
- Future browse/download inside the portal would need external JWT auth. Known gotchas:
  - JWT users can't also password-login
  - an unknown `sub` auto-creates a user
  - `sub` = admin username, or an admin group claim, grants admin
  - docs: https://filebrowserquantum.com/en/docs/configuration/authentication/jwt/

---

## 8. Security / ops checklist

- [x] Token server-only (`server-only`; `grep` of `.next/static` shows no token or share code)
- [x] Client from session; `projectId` validated against client + visibility + status; `kind` enum; paths built only in `lib/storage/paths.ts` (unit-tested)
- [x] Upload traversal rejected by FileBrowser (`400`); mkdir traversal sanitized
- [x] Shares expire (7 d), rotate (< 24 h), are revoked on archive / contact removal / project hidden or closed / path change
- [x] Executables blocked client-side; 5 GB client cap
- [ ] Caddy CORS + `request_buffers` deployed (§2.1)
- [ ] `portal-service` non-admin account + token (§2.2)
- [ ] Disk-usage alert + backups for the Freelancing folder
- [ ] Periodic cleanup of `*.uploading.tmp`

---

## 9. Vercel cost

Uploads never touch Vercel. Only Server Action JSON (≤ 1 request per file batch per project/kind, plus rare rotations) runs there.

---

## 10. Verification performed (2026-09-15)

- **Unit tests:** `npm test` passes (33 tests, incl. path/slug/traversal, kind checks, rename numbering, enum sync). `npm run lint`, `tsc --noEmit`, and `npm run build` are clean.
- **Server flow** against the Neon dev DB + local FileBrowser v1.5.6:
  - provisioning
  - share reuse
  - concurrent mint converges
  - rotation kills the old hash
  - revoke kills hashes and clears rows
  - failed provisioning is non-fatal
- **Real browser** (portal signed in as the dev test client, through local Caddy with the §2.1 config):
  - pick type → drop → 25/30 MB chunked uploads land in `clients/acme_test/website-5d40e8/pictures/` (sha256 match)
  - PDF → "Upload as Files" → `files/`
  - `.exe` blocked
  - duplicate → `logo (1).png`
  - switching type mid-upload keeps the destination
  - link deleted in FileBrowser → 404 → auto-refresh → both parallel uploads succeed on one new link
  - simulated network failure → 4 attempts → error + Retry → success
  - stalled request → watchdog abort → retry
  - Cancel works
  - `beforeunload` guard blocks reload while uploading
  - arrow-key radio navigation
  - disabled/shake state before choosing a type
  - 375 px: no overflow, 88×96 touch targets
- **Caddy config (§2.1)** in a local container:
  - allowed origin preflight → 204 with headers
  - look-alike origin → no headers
  - 10 MB body to a dead hash → 404 in 30 ms (hangs ~forever without `request_buffers`)
  - other FileBrowser routes and UI unaffected
- **Not verified live:** tampering `projectId` to another client's project from a browser (enforced by the DAL query; no second signed-in client was available), and the real `storage.lukebaber.com` (pending §2).

---

## 11. Rollout steps

1. Storage host: §2.1 Caddy, §2.2 service account, then run the §2.1 curl checks.
2. Apply the migration to the Neon **production** branch (`drizzle/0001_portal_upload_dropbox.sql`, e.g. `npm run db:migrate` with production `DATABASE_URL_UNPOOLED`).
3. Add env vars (§2.3) in Vercel, then deploy.
4. Smoke test: as a test client, upload one picture to a project and confirm it appears under `<client>/<project>/pictures/` in FileBrowser.
5. Optional: set a filesystem quota per client folder and schedule the `*.uploading.tmp` cleanup.

---

## 12. Validation log

### Rev 1 (2026-09-15) — validated original draft
Fixed wrong endpoints (`/api/share`, `PATCH /api/users?username=`, required `source`, raw-body chunk protocol), removed nonexistent features (quotas, server-side type/size limits, CORS config), flagged the Caddy CORS blocker, and aligned with repo conventions (Server Actions, non-fatal provisioning, optional env vars).

### Rev 2 (2026-09-15) — Luke's direction
Per-project folders; upload dropbox UX (project → Pictures/Videos/Files → drag & drop); removed notify email, per-client FileBrowser users, and JWT; non-admin `portal-service`.

### Rev 3 (2026-09-15) — implemented & tested
- Live instance identified as **v1.5.x stable**; tested on 1.5.6 and 2.0.6.
- **`action=rename` doesn't work** on upload shares → client-side rename on 409.
- **Caddy hangs on early rejections of large bodies** → `request_buffers 16MiB` in the handoff config + a 30 s stall watchdog in the uploader.
- Links deleted outside the portal → `staleHash` replacement flow.
- Chunk size 10 MiB (FileBrowser default); FileBrowser auto-creates parent folders, so no segment-by-segment mkdir.
- `storagePath` validation is permissive normalization instead of a lowercase regex, so existing paths keep working.
