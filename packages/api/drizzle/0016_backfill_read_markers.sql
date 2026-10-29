-- Custom SQL migration file, put your code below! --
-- Existing Members start with nothing unread: their Read Marker is their Conversation's last sequence.
UPDATE "conversation_members" SET "read_marker" = "conversations"."last_sequence"
FROM "conversations"
WHERE "conversations"."id" = "conversation_members"."conversation_id";
