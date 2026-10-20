CREATE TABLE "token_deny_list" (
	"jti" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "previous_refresh_token_hash" text;--> statement-breakpoint
CREATE INDEX "sessions_previous_refresh_token_hash_idx" ON "sessions" USING btree ("previous_refresh_token_hash");