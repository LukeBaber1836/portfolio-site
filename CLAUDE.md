@AGENTS.md

# Client portal ↔ admin parity

Whenever you add or change something on the client side (`app/portal/**`, `components/portal/**`), decide whether the admin (the site owner) needs to see it too — anything a client enters, submits, uploads, or changes almost always does. If so, build the admin side in the same change; don't wait to be asked.

- Show it everywhere the admin would look for it: usually both the client page (`app/admin/clients/[id]`) and, for anything tied to a client's work, the project page (`app/admin/projects/[id]`).
- Admin views of client-entered data are read-only unless asked otherwise. Put shared display pieces in `components/shared/` and admin wrappers in `components/admin/`.
- The reverse also applies: when admin-side data should be visible to the client, add the portal view.
- In the summary, say where the change shows up on both sides.
