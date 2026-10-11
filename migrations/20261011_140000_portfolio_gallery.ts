import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Add ordered upload relations for portfolio gallery images. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "public"."portfolios_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "uploads_id" integer
    );
    ALTER TABLE "public"."portfolios_rels" ADD CONSTRAINT "portfolios_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "public"."portfolios_rels" ADD CONSTRAINT "portfolios_rels_uploads_fk" FOREIGN KEY ("uploads_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "portfolios_rels_order_idx" ON "public"."portfolios_rels" USING btree ("order");
    CREATE INDEX "portfolios_rels_parent_idx" ON "public"."portfolios_rels" USING btree ("parent_id");
    CREATE INDEX "portfolios_rels_path_idx" ON "public"."portfolios_rels" USING btree ("path");
    CREATE INDEX "portfolios_rels_uploads_id_idx" ON "public"."portfolios_rels" USING btree ("uploads_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE "public"."portfolios_rels";`)
}
