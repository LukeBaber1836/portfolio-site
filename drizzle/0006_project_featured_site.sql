CREATE TYPE "public"."site_kind" AS ENUM('production', 'dev');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "featured_site" "site_kind" DEFAULT 'production' NOT NULL;