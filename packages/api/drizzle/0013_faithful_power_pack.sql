ALTER TABLE "membership_notes" RENAME TO "system_messages";--> statement-breakpoint
ALTER TABLE "system_messages" DROP CONSTRAINT "membership_notes_kind_check";--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_note_body_check";--> statement-breakpoint
ALTER TABLE "system_messages" DROP CONSTRAINT "membership_notes_subject_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "system_messages" DROP CONSTRAINT "membership_notes_message_kind_fk";
--> statement-breakpoint
ALTER TABLE "system_messages" ADD CONSTRAINT "system_messages_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_messages" ADD CONSTRAINT "system_messages_message_kind_fk" FOREIGN KEY ("message_id","kind") REFERENCES "public"."messages"("id","kind") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_messages" ADD CONSTRAINT "system_messages_kind_check" CHECK ("system_messages"."kind" <> 'text');--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_system_message_body_check" CHECK ("messages"."kind" = 'text' or "messages"."body" = '');