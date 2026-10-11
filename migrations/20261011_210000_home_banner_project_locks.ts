import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Add lock relations for the CMS banner and collaborative project collections. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."payload_locked_documents_rels"
      ADD COLUMN "home_banners_id" integer,
      ADD COLUMN "projects_id" integer;
    ALTER TABLE "public"."payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_home_banners_fk" FOREIGN KEY ("home_banners_id") REFERENCES "public"."home_banners"("id") ON DELETE cascade ON UPDATE no action,
      ADD CONSTRAINT "payload_locked_documents_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_home_banners_id_idx" ON "public"."payload_locked_documents_rels" USING btree ("home_banners_id");
    CREATE INDEX "payload_locked_documents_rels_projects_id_idx" ON "public"."payload_locked_documents_rels" USING btree ("projects_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."payload_locked_documents_rels"
      DROP CONSTRAINT "payload_locked_documents_rels_home_banners_fk",
      DROP CONSTRAINT "payload_locked_documents_rels_projects_fk";
    DROP INDEX "public"."payload_locked_documents_rels_home_banners_id_idx";
    DROP INDEX "public"."payload_locked_documents_rels_projects_id_idx";
    ALTER TABLE "public"."payload_locked_documents_rels"
      DROP COLUMN "home_banners_id",
      DROP COLUMN "projects_id";
  `)
}
