CREATE TABLE "membership_periods" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_sequence" integer NOT NULL,
	"end_sequence" integer DEFAULT 2147483647 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_periods_range_check" CHECK ("membership_periods"."end_sequence" >= "membership_periods"."start_sequence")
);
--> statement-breakpoint
DROP TABLE "removed_group_members" CASCADE;--> statement-breakpoint
ALTER TABLE "membership_periods" ADD CONSTRAINT "membership_periods_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_periods" ADD CONSTRAINT "membership_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_periods_conversation_user_idx" ON "membership_periods" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "membership_periods_user_idx" ON "membership_periods" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_periods_open_unique" ON "membership_periods" USING btree ("conversation_id","user_id") WHERE "membership_periods"."end_sequence" = 2147483647;