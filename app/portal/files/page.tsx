import { FilesPanel } from "@/components/portal/FilesPanel";
import { UploadDropbox } from "@/components/portal/UploadDropbox";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireClient } from "@/lib/auth/guards";
import { portalUploadProjects } from "@/lib/dal/portal";
import { env } from "@/lib/env";
import { isStorageEnabled } from "@/lib/storage/filebrowser";

export const metadata = { title: "Files" };

export default async function PortalFilesPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { client } = await requireClient();
  const uploadsEnabled = isStorageEnabled();
  const [params, projects] = await Promise.all([searchParams, uploadsEnabled ? portalUploadProjects() : []]);

  // Deep-link straight to the client's folder when one is configured (FileBrowser returns there after login).
  const path = client.storagePath?.replace(/^\/+|\/+$/g, "");
  const storageUrl = path ? `${env.STORAGE_URL}/files/${path.split("/").map(encodeURIComponent).join("/")}/` : env.STORAGE_URL;
  const host = new URL(env.STORAGE_URL).host;

  return (
    <>
      <PageHeader title="Files" description="Send pictures, videos, and files for your projects." />
      {uploadsEnabled ? (
        <div className="space-y-6">
          <UploadDropbox projects={projects} initialProjectId={params.project} />
          {client.storageUsername && <FilesPanel storageUrl={storageUrl} username={client.storageUsername} host={host} secondary />}
        </div>
      ) : (
        <FilesPanel storageUrl={storageUrl} username={client.storageUsername} host={host} />
      )}
    </>
  );
}
