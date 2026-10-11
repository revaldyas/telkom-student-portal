import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Align the project array table column names with Payload's generated schema. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects_members' AND column_name = 'order'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects_members' AND column_name = '_order'
      ) THEN
        ALTER TABLE "public"."projects_members" RENAME COLUMN "order" TO "_order";
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects_members' AND column_name = 'parent_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects_members' AND column_name = '_parent_id'
      ) THEN
        ALTER TABLE "public"."projects_members" RENAME COLUMN "parent_id" TO "_parent_id";
      END IF;
    END $$;
    DROP INDEX IF EXISTS "public"."projects_members_parent_idx";
    CREATE INDEX IF NOT EXISTS "projects_members_parent_id_idx" ON "public"."projects_members" USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."projects_members_parent_id_idx";
    ALTER TABLE "public"."projects_members" RENAME COLUMN "_order" TO "order";
    ALTER TABLE "public"."projects_members" RENAME COLUMN "_parent_id" TO "parent_id";
    CREATE INDEX IF NOT EXISTS "projects_members_parent_idx" ON "public"."projects_members" USING btree ("parent_id");
  `)
}
