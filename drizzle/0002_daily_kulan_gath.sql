CREATE TYPE "public"."reference_kind" AS ENUM('link', 'note');--> statement-breakpoint
CREATE TYPE "public"."reference_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "project_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" "reference_kind" DEFAULT 'link' NOT NULL,
	"url" text,
	"title" text NOT NULL,
	"note" text,
	"screenshot_url" text,
	"favicon_url" text,
	"status" "reference_status" DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_references" ADD CONSTRAINT "project_references_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_references_project_idx" ON "project_references" USING btree ("project_id","sort_order");