CREATE TABLE "groups" (
	"conversation_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_kind_check";--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_kind_check" CHECK ("conversations"."kind" in ('direct', 'group'));