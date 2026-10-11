import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Add project mentor invitations, review history, and the submitted-for-review state. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_projects_verification_status" ADD VALUE IF NOT EXISTS 'submitted';
    CREATE TYPE "public"."enum_projects_mentor_assignments_assignment_role" AS ENUM ('primary', 'supporting');
    CREATE TYPE "public"."enum_projects_mentor_assignments_response" AS ENUM ('invited', 'accepted', 'declined');
    CREATE TYPE "public"."enum_projects_review_history_reviewer_role" AS ENUM ('primary', 'supporting');
    CREATE TYPE "public"."enum_projects_review_history_decision" AS ENUM ('comment', 'verified', 'revision-requested');

    CREATE TABLE "public"."projects_mentor_assignments" (
      "id" serial PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "mentor_id" integer NOT NULL,
      "assignment_role" "enum_projects_mentor_assignments_assignment_role" NOT NULL,
      "response" "enum_projects_mentor_assignments_response" DEFAULT 'invited' NOT NULL
    );
    ALTER TABLE "public"."projects_mentor_assignments" ADD CONSTRAINT "projects_mentor_assignments_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "public"."projects_mentor_assignments" ADD CONSTRAINT "projects_mentor_assignments_mentor_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "projects_mentor_assignments_order_idx" ON "public"."projects_mentor_assignments" USING btree ("_order");
    CREATE INDEX "projects_mentor_assignments_parent_id_idx" ON "public"."projects_mentor_assignments" USING btree ("_parent_id");
    CREATE INDEX "projects_mentor_assignments_mentor_id_idx" ON "public"."projects_mentor_assignments" USING btree ("mentor_id");

    CREATE TABLE "public"."projects_review_history" (
      "id" serial PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "reviewer_id" integer NOT NULL,
      "reviewer_role" "enum_projects_review_history_reviewer_role" NOT NULL,
      "decision" "enum_projects_review_history_decision" NOT NULL,
      "feedback" varchar NOT NULL,
      "reviewed_at" timestamp(3) with time zone NOT NULL
    );
    ALTER TABLE "public"."projects_review_history" ADD CONSTRAINT "projects_review_history_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "public"."projects_review_history" ADD CONSTRAINT "projects_review_history_reviewer_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "projects_review_history_order_idx" ON "public"."projects_review_history" USING btree ("_order");
    CREATE INDEX "projects_review_history_parent_id_idx" ON "public"."projects_review_history" USING btree ("_parent_id");
    CREATE INDEX "projects_review_history_reviewer_id_idx" ON "public"."projects_review_history" USING btree ("reviewer_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "public"."projects_review_history";
    DROP TABLE "public"."projects_mentor_assignments";
    DROP TYPE "public"."enum_projects_review_history_decision";
    DROP TYPE "public"."enum_projects_review_history_reviewer_role";
    DROP TYPE "public"."enum_projects_mentor_assignments_response";
    DROP TYPE "public"."enum_projects_mentor_assignments_assignment_role";
  `)
}
