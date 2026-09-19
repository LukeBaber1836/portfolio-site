"use client";

import { useCallback, useState } from "react";

import { ProjectFilesBrowser } from "@/components/portal/ProjectFilesBrowser";
import { UploadDropbox, type UploadProject } from "@/components/portal/UploadDropbox";
import type { UploadKind } from "@/lib/db/schema";

/** A finished upload, identified by a counter so repeat uploads to the same folder still register. */
export type UploadedSignal = { projectId: string; kind: UploadKind; seq: number };

/** Ties the dropbox to the browser under it: each finished upload refreshes just the folder it landed in. */
export function FilesWorkspace({ projects, initialProjectId }: { projects: UploadProject[]; initialProjectId?: string }) {
  const [uploaded, setUploaded] = useState<UploadedSignal | null>(null);
  const onUploaded = useCallback((projectId: string, kind: UploadKind) => {
    setUploaded((prev) => ({ projectId, kind, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  return (
    <div className="space-y-6">
      <UploadDropbox projects={projects} initialProjectId={initialProjectId} onUploaded={onUploaded} />
      <ProjectFilesBrowser projects={projects} uploaded={uploaded} />
    </div>
  );
}
