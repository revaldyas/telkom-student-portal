import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Foto grup/proyek pada percakapan. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "chat_conversations" ADD COLUMN "photo_id" integer;
    ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_photo_id_uploads_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "chat_conversations_photo_idx" ON "chat_conversations" USING btree ("photo_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "chat_conversations_photo_idx";
    ALTER TABLE "chat_conversations" DROP CONSTRAINT "chat_conversations_photo_id_uploads_id_fk";
    ALTER TABLE "chat_conversations" DROP COLUMN "photo_id";
  `)
}
