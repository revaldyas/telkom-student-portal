import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Add profile competencies, portfolio verification, and the opportunity channel. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_portfolios_verification_status" AS ENUM ('unreviewed', 'verified', 'revision-requested');
    CREATE TYPE "public"."enum_portfolio_reviews_decision" AS ENUM ('verified', 'revision-requested');
    CREATE TYPE "public"."enum_opportunities_type" AS ENUM ('competition', 'exhibition', 'challenge', 'mentoring', 'collaboration', 'other');
    CREATE TYPE "public"."enum_opportunities_status" AS ENUM ('draft', 'open', 'closed');
    CREATE TYPE "public"."enum_opportunity_interests_status" AS ENUM ('interested', 'contacted', 'completed');

    ALTER TABLE "portfolios"
      ADD COLUMN "project_file_id" integer,
      ADD COLUMN "verification_status" "enum_portfolios_verification_status" DEFAULT 'unreviewed',
      ADD COLUMN "verified_by_id" integer,
      ADD COLUMN "verified_at" timestamp(3) with time zone,
      ADD COLUMN "review_feedback" varchar;
    ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_project_file_id_uploads_id_fk" FOREIGN KEY ("project_file_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "portfolios_project_file_idx" ON "portfolios" USING btree ("project_file_id");
    CREATE INDEX "portfolios_verified_by_idx" ON "portfolios" USING btree ("verified_by_id");

    CREATE TABLE "users_texts" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "text" varchar
    );
    ALTER TABLE "users_texts" ADD CONSTRAINT "users_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "users_texts_order_idx" ON "users_texts" USING btree ("order");
    CREATE INDEX "users_texts_parent_idx" ON "users_texts" USING btree ("parent_id");
    CREATE INDEX "users_texts_path_idx" ON "users_texts" USING btree ("path");

    CREATE TABLE "portfolio_reviews" (
      "id" serial PRIMARY KEY NOT NULL,
      "portfolio_id" integer NOT NULL,
      "reviewer_id" integer NOT NULL,
      "review_key" varchar NOT NULL,
      "decision" "enum_portfolio_reviews_decision" DEFAULT 'revision-requested' NOT NULL,
      "feedback" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "portfolio_reviews" ADD CONSTRAINT "portfolio_reviews_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "portfolio_reviews" ADD CONSTRAINT "portfolio_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    CREATE UNIQUE INDEX "portfolio_reviews_portfolio_idx" ON "portfolio_reviews" USING btree ("portfolio_id");
    CREATE INDEX "portfolio_reviews_reviewer_idx" ON "portfolio_reviews" USING btree ("reviewer_id");
    CREATE UNIQUE INDEX "portfolio_reviews_review_key_idx" ON "portfolio_reviews" USING btree ("review_key");
    CREATE INDEX "portfolio_reviews_updated_at_idx" ON "portfolio_reviews" USING btree ("updated_at");
    CREATE INDEX "portfolio_reviews_created_at_idx" ON "portfolio_reviews" USING btree ("created_at");

    CREATE TABLE "opportunities" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "type" "enum_opportunities_type" NOT NULL,
      "organizer" varchar NOT NULL,
      "summary" varchar NOT NULL,
      "requirements" varchar,
      "cover_image_id" integer,
      "opens_at" timestamp(3) with time zone,
      "deadline" timestamp(3) with time zone,
      "url" varchar,
      "contact" varchar,
      "status" "enum_opportunities_status" DEFAULT 'draft' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_cover_image_id_uploads_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "opportunities_cover_image_idx" ON "opportunities" USING btree ("cover_image_id");
    CREATE INDEX "opportunities_updated_at_idx" ON "opportunities" USING btree ("updated_at");
    CREATE INDEX "opportunities_created_at_idx" ON "opportunities" USING btree ("created_at");

    CREATE TABLE "opportunities_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "programs_id" integer
    );
    ALTER TABLE "opportunities_rels" ADD CONSTRAINT "opportunities_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "opportunities_rels" ADD CONSTRAINT "opportunities_rels_programs_fk" FOREIGN KEY ("programs_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "opportunities_rels_order_idx" ON "opportunities_rels" USING btree ("order");
    CREATE INDEX "opportunities_rels_parent_idx" ON "opportunities_rels" USING btree ("parent_id");
    CREATE INDEX "opportunities_rels_path_idx" ON "opportunities_rels" USING btree ("path");
    CREATE INDEX "opportunities_rels_programs_id_idx" ON "opportunities_rels" USING btree ("programs_id");

    CREATE TABLE "opportunity_interests" (
      "id" serial PRIMARY KEY NOT NULL,
      "opportunity_id" integer NOT NULL,
      "student_id" integer NOT NULL,
      "interest_key" varchar NOT NULL,
      "note" varchar,
      "status" "enum_opportunity_interests_status" DEFAULT 'interested',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "opportunity_interests" ADD CONSTRAINT "opportunity_interests_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "opportunity_interests" ADD CONSTRAINT "opportunity_interests_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "opportunity_interests_opportunity_idx" ON "opportunity_interests" USING btree ("opportunity_id");
    CREATE INDEX "opportunity_interests_student_idx" ON "opportunity_interests" USING btree ("student_id");
    CREATE UNIQUE INDEX "opportunity_interests_interest_key_idx" ON "opportunity_interests" USING btree ("interest_key");
    CREATE INDEX "opportunity_interests_updated_at_idx" ON "opportunity_interests" USING btree ("updated_at");
    CREATE INDEX "opportunity_interests_created_at_idx" ON "opportunity_interests" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN "portfolio_reviews_id" integer,
      ADD COLUMN "opportunities_id" integer,
      ADD COLUMN "opportunity_interests_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_portfolio_reviews_fk" FOREIGN KEY ("portfolio_reviews_id") REFERENCES "public"."portfolio_reviews"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_opportunities_fk" FOREIGN KEY ("opportunities_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_opportunity_interests_fk" FOREIGN KEY ("opportunity_interests_id") REFERENCES "public"."opportunity_interests"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_portfolio_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("portfolio_reviews_id");
    CREATE INDEX "payload_locked_documents_rels_opportunities_id_idx" ON "payload_locked_documents_rels" USING btree ("opportunities_id");
    CREATE INDEX "payload_locked_documents_rels_opportunity_interests_id_idx" ON "payload_locked_documents_rels" USING btree ("opportunity_interests_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_portfolio_reviews_fk", DROP CONSTRAINT "payload_locked_documents_rels_opportunities_fk", DROP CONSTRAINT "payload_locked_documents_rels_opportunity_interests_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "portfolio_reviews_id", DROP COLUMN "opportunities_id", DROP COLUMN "opportunity_interests_id";
    DROP TABLE "opportunity_interests";
    DROP TABLE "opportunities_rels";
    DROP TABLE "opportunities";
    DROP TABLE "portfolio_reviews";
    DROP TABLE "users_texts";
    ALTER TABLE "portfolios" DROP CONSTRAINT "portfolios_project_file_id_uploads_id_fk", DROP CONSTRAINT "portfolios_verified_by_id_users_id_fk";
    ALTER TABLE "portfolios" DROP COLUMN "project_file_id", DROP COLUMN "verification_status", DROP COLUMN "verified_by_id", DROP COLUMN "verified_at", DROP COLUMN "review_feedback";
    DROP TYPE "public"."enum_opportunity_interests_status";
    DROP TYPE "public"."enum_opportunities_status";
    DROP TYPE "public"."enum_opportunities_type";
    DROP TYPE "public"."enum_portfolio_reviews_decision";
    DROP TYPE "public"."enum_portfolios_verification_status";
  `)
}
