import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Add CMS-managed homepage testimonials. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_testimonials_status" AS ENUM ('draft', 'published');
    CREATE TABLE "public"."testimonials" (
      "id" serial PRIMARY KEY NOT NULL,
      "seed_key" varchar NOT NULL,
      "quote" varchar NOT NULL,
      "name" varchar NOT NULL,
      "role" varchar NOT NULL,
      "program" varchar,
      "is_sample" boolean DEFAULT false NOT NULL,
      "sort_order" numeric DEFAULT 0 NOT NULL,
      "status" "public"."enum_testimonials_status" DEFAULT 'draft' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX "testimonials_seed_key_idx" ON "public"."testimonials" USING btree ("seed_key");
    CREATE INDEX "testimonials_sort_order_idx" ON "public"."testimonials" USING btree ("sort_order");
    CREATE INDEX "testimonials_status_idx" ON "public"."testimonials" USING btree ("status");
    CREATE INDEX "testimonials_updated_at_idx" ON "public"."testimonials" USING btree ("updated_at");
    CREATE INDEX "testimonials_created_at_idx" ON "public"."testimonials" USING btree ("created_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "public"."testimonials";
    DROP TYPE "public"."enum_testimonials_status";
  `)
}
