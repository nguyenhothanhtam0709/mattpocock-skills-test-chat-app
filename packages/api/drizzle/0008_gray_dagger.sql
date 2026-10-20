CREATE TABLE "removed_group_members" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "removed_group_members_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "removed_group_members" ADD CONSTRAINT "removed_group_members_conversation_id_groups_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."groups"("conversation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "removed_group_members" ADD CONSTRAINT "removed_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;