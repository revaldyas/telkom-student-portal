import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Create the collaborative projects collection and its members/media relations. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_projects_verification_status" AS ENUM ('unreviewed', 'verified', 'revision-requested');
    CREATE TYPE "public"."enum_projects_status" AS ENUM ('draft', 'published');
    CREATE TABLE "public"."projects" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "summary" varchar NOT NULL,
      "details" jsonb,
      "category_ref_id" integer,
      "created_by_id" integer NOT NULL,
      "cover_image_id" integer,
      "year" numeric DEFAULT 2026,
      "project_url" varchar,
      "verification_status" "enum_projects_verification_status" DEFAULT 'unreviewed',
      "verified_by_id" integer,
      "verified_at" timestamp(3) with time zone,
      "review_feedback" varchar,
      "status" "enum_projects_status" DEFAULT 'draft' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_category_ref_id_portfolio_categories_id_fk" FOREIGN KEY ("category_ref_id") REFERENCES "public"."portfolio_categories"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_cover_image_id_uploads_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    CREATE UNIQUE INDEX "projects_slug_idx" ON "public"."projects" USING btree ("slug");
    CREATE INDEX "projects_category_ref_idx" ON "public"."projects" USING btree ("category_ref_id");
    CREATE INDEX "projects_created_by_idx" ON "public"."projects" USING btree ("created_by_id");
    CREATE INDEX "projects_cover_image_idx" ON "public"."projects" USING btree ("cover_image_id");
    CREATE INDEX "projects_verified_by_idx" ON "public"."projects" USING btree ("verified_by_id");
    CREATE INDEX "projects_status_idx" ON "public"."projects" USING btree ("status");
    CREATE INDEX "projects_updated_at_idx" ON "public"."projects" USING btree ("updated_at");
    CREATE INDEX "projects_created_at_idx" ON "public"."projects" USING btree ("created_at");

    CREATE TABLE "public"."projects_texts" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "text" varchar
    );
    ALTER TABLE "public"."projects_texts" ADD CONSTRAINT "projects_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "projects_texts_order_parent" ON "public"."projects_texts" USING btree ("order", "parent_id");

    CREATE TABLE "public"."projects_members" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "member_id" integer NOT NULL,
      "contribution" varchar NOT NULL
    );
    ALTER TABLE "public"."projects_members" ADD CONSTRAINT "projects_members_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "public"."projects_members" ADD CONSTRAINT "projects_members_member_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "projects_members_order_idx" ON "public"."projects_members" USING btree ("order");
    CREATE INDEX "projects_members_parent_idx" ON "public"."projects_members" USING btree ("parent_id");
    CREATE INDEX "projects_members_member_idx" ON "public"."projects_members" USING btree ("member_id");

    CREATE TABLE "public"."projects_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "uploads_id" integer
    );
    ALTER TABLE "public"."projects_rels" ADD CONSTRAINT "projects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "public"."projects_rels" ADD CONSTRAINT "projects_rels_uploads_fk" FOREIGN KEY ("uploads_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "projects_rels_order_idx" ON "public"."projects_rels" USING btree ("order");
    CREATE INDEX "projects_rels_parent_idx" ON "public"."projects_rels" USING btree ("parent_id");
    CREATE INDEX "projects_rels_path_idx" ON "public"."projects_rels" USING btree ("path");
    CREATE INDEX "projects_rels_uploads_id_idx" ON "public"."projects_rels" USING btree ("uploads_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "public"."projects_rels";
    DROP TABLE "public"."projects_members";
    DROP TABLE "public"."projects_texts";
    DROP TABLE "public"."projects";
    DROP TYPE "public"."enum_projects_status";
    DROP TYPE "public"."enum_projects_verification_status";
  `)
}
