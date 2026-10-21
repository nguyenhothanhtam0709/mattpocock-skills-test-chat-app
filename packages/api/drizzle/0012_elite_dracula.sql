ALTER TABLE "membership_notes" DROP CONSTRAINT "membership_notes_message_id_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "membership_notes" ADD COLUMN "kind" text NOT NULL;--> statement-breakpoint
ALTER TABLE "membership_notes" ADD CONSTRAINT "membership_notes_message_kind_fk" FOREIGN KEY ("message_id","kind") REFERENCES "public"."messages"("id","kind") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_notes" ADD CONSTRAINT "membership_notes_kind_check" CHECK ("membership_notes"."kind" <> 'text');--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_note_body_check" CHECK ("messages"."kind" = 'text' or "messages"."body" = '');