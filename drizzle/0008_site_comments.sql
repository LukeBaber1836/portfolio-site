CREATE TYPE "public"."site_comment_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."site_viewport" AS ENUM('desktop', 'tablet', 'mobile');--> statement-breakpoint
CREATE TABLE "site_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"from_admin" boolean DEFAULT false NOT NULL,
	"page_path" text NOT NULL,
	"selector" text,
	"offset_x" real,
	"offset_y" real,
	"doc_x" real NOT NULL,
	"doc_y" real NOT NULL,
	"viewport" "site_viewport" DEFAULT 'desktop' NOT NULL,
	"body" jsonb NOT NULL,
	"body_text" text NOT NULL,
	"status" "site_comment_status" DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_comments" ADD CONSTRAINT "site_comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_comments_project_idx" ON "site_comments" USING btree ("project_id","page_path","created_at");