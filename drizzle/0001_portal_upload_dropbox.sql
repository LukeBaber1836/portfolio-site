CREATE TYPE "public"."upload_kind" AS ENUM('pictures', 'videos', 'files');--> statement-breakpoint
CREATE TABLE "project_upload_shares" (
	"project_id" uuid NOT NULL,
	"kind" "upload_kind" NOT NULL,
	"hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_upload_shares_project_id_kind_pk" PRIMARY KEY("project_id","kind")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "storage_provisioned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "storage_folder" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "storage_provisioned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_upload_shares" ADD CONSTRAINT "project_upload_shares_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;