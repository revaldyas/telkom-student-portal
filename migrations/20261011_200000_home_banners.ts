import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Add CMS-managed homepage hero banners. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_home_banners_status" AS ENUM ('draft', 'published');
    CREATE TABLE "public"."home_banners" (
      "id" serial PRIMARY KEY NOT NULL,
      "eyebrow" varchar DEFAULT 'SOROTAN TEL-CREATION' NOT NULL,
      "title" varchar NOT NULL,
      "description" varchar NOT NULL,
      "image_id" integer NOT NULL,
      "primary_button_label" varchar NOT NULL,
      "primary_button_url" varchar NOT NULL,
      "secondary_button_label" varchar,
      "secondary_button_url" varchar,
      "sort_order" numeric DEFAULT 0 NOT NULL,
      "status" "public"."enum_home_banners_status" DEFAULT 'draft' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "public"."home_banners" ADD CONSTRAINT "home_banners_image_id_uploads_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "home_banners_image_idx" ON "public"."home_banners" USING btree ("image_id");
    CREATE INDEX "home_banners_sort_order_idx" ON "public"."home_banners" USING btree ("sort_order");
    CREATE INDEX "home_banners_status_idx" ON "public"."home_banners" USING btree ("status");
    CREATE INDEX "home_banners_updated_at_idx" ON "public"."home_banners" USING btree ("updated_at");
    CREATE INDEX "home_banners_created_at_idx" ON "public"."home_banners" USING btree ("created_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "public"."home_banners";
    DROP TYPE "public"."enum_home_banners_status";
  `)
}
