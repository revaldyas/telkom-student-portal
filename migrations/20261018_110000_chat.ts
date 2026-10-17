import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Pesan: percakapan (pribadi, grup, kelas, proyek), anggota, pesan, blokir, dan laporan. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "chat_conversations" (
      "id" serial PRIMARY KEY NOT NULL,
      "kind" varchar NOT NULL,
      "ref_key" varchar NOT NULL,
      "title" varchar,
      "created_by_id" integer,
      "last_message_at" timestamp(3) with time zone,
      "last_message_preview" varchar,
      "last_message_sender" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE "chat_members" (
      "id" serial PRIMARY KEY NOT NULL,
      "conversation_id" integer NOT NULL,
      "user_id" integer NOT NULL,
      "role" varchar DEFAULT 'member',
      "status" varchar DEFAULT 'active',
      "invited_by_id" integer,
      "last_read_id" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE "chat_messages" (
      "id" serial PRIMARY KEY NOT NULL,
      "conversation_id" integer NOT NULL,
      "sender_id" integer NOT NULL,
      "body" varchar NOT NULL,
      "deleted" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE "chat_blocks" (
      "id" serial PRIMARY KEY NOT NULL,
      "blocker_id" integer NOT NULL,
      "blocked_id" integer NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE "chat_reports" (
      "id" serial PRIMARY KEY NOT NULL,
      "message_id" integer NOT NULL,
      "reporter_id" integer NOT NULL,
      "reason" varchar NOT NULL,
      "note" varchar,
      "status" varchar DEFAULT 'open',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "chat_blocks" ADD CONSTRAINT "chat_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "chat_blocks" ADD CONSTRAINT "chat_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "chat_reports" ADD CONSTRAINT "chat_reports_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "chat_reports" ADD CONSTRAINT "chat_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

    CREATE UNIQUE INDEX "chat_conversations_ref_key_idx" ON "chat_conversations" USING btree ("ref_key");
    CREATE INDEX "chat_conversations_kind_idx" ON "chat_conversations" USING btree ("kind");
    CREATE INDEX "chat_conversations_last_message_at_idx" ON "chat_conversations" USING btree ("last_message_at");
    CREATE INDEX "chat_conversations_updated_at_idx" ON "chat_conversations" USING btree ("updated_at");
    CREATE INDEX "chat_conversations_created_at_idx" ON "chat_conversations" USING btree ("created_at");
    CREATE INDEX "chat_members_conversation_idx" ON "chat_members" USING btree ("conversation_id");
    CREATE INDEX "chat_members_user_idx" ON "chat_members" USING btree ("user_id");
    CREATE UNIQUE INDEX "chat_members_conversation_user_idx" ON "chat_members" USING btree ("conversation_id", "user_id");
    CREATE INDEX "chat_members_updated_at_idx" ON "chat_members" USING btree ("updated_at");
    CREATE INDEX "chat_members_created_at_idx" ON "chat_members" USING btree ("created_at");
    CREATE INDEX "chat_messages_conversation_idx" ON "chat_messages" USING btree ("conversation_id", "id");
    CREATE INDEX "chat_messages_updated_at_idx" ON "chat_messages" USING btree ("updated_at");
    CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages" USING btree ("created_at");
    CREATE INDEX "chat_blocks_blocker_idx" ON "chat_blocks" USING btree ("blocker_id");
    CREATE INDEX "chat_blocks_blocked_idx" ON "chat_blocks" USING btree ("blocked_id");
    CREATE INDEX "chat_blocks_updated_at_idx" ON "chat_blocks" USING btree ("updated_at");
    CREATE INDEX "chat_blocks_created_at_idx" ON "chat_blocks" USING btree ("created_at");
    CREATE INDEX "chat_reports_status_idx" ON "chat_reports" USING btree ("status");
    CREATE INDEX "chat_reports_updated_at_idx" ON "chat_reports" USING btree ("updated_at");
    CREATE INDEX "chat_reports_created_at_idx" ON "chat_reports" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN "chat_conversations_id" integer,
      ADD COLUMN "chat_members_id" integer,
      ADD COLUMN "chat_messages_id" integer,
      ADD COLUMN "chat_blocks_id" integer,
      ADD COLUMN "chat_reports_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_conversations_fk" FOREIGN KEY ("chat_conversations_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_members_fk" FOREIGN KEY ("chat_members_id") REFERENCES "public"."chat_members"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_messages_fk" FOREIGN KEY ("chat_messages_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_blocks_fk" FOREIGN KEY ("chat_blocks_id") REFERENCES "public"."chat_blocks"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_reports_fk" FOREIGN KEY ("chat_reports_id") REFERENCES "public"."chat_reports"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_chat_conversations_id_idx" ON "payload_locked_documents_rels" USING btree ("chat_conversations_id");
    CREATE INDEX "payload_locked_documents_rels_chat_members_id_idx" ON "payload_locked_documents_rels" USING btree ("chat_members_id");
    CREATE INDEX "payload_locked_documents_rels_chat_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("chat_messages_id");
    CREATE INDEX "payload_locked_documents_rels_chat_blocks_id_idx" ON "payload_locked_documents_rels" USING btree ("chat_blocks_id");
    CREATE INDEX "payload_locked_documents_rels_chat_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("chat_reports_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN "chat_conversations_id",
      DROP COLUMN "chat_members_id",
      DROP COLUMN "chat_messages_id",
      DROP COLUMN "chat_blocks_id",
      DROP COLUMN "chat_reports_id";
    DROP TABLE "chat_reports";
    DROP TABLE "chat_blocks";
    DROP TABLE "chat_messages";
    DROP TABLE "chat_members";
    DROP TABLE "chat_conversations";
  `)
}
