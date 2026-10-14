ALTER TABLE "time_entries" ADD COLUMN "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "paused_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" drop column "duration_seconds";--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "duration_seconds" integer GENERATED ALWAYS AS (case when ended_at is null then null else greatest(0, floor(extract(epoch from (ended_at - started_at)))::int - paused_seconds) end) STORED;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_paused_seconds_nonneg" CHECK (paused_seconds >= 0);
