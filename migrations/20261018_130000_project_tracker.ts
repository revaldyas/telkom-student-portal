import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Project tracker (tugas, komentar, riwayat aktivitas) dan status online pengguna. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "project_tasks" (
      "id" serial PRIMARY KEY NOT NULL,
      "project_id" integer NOT NULL,
      "title" varchar NOT NULL,
      "description" varchar,
      "status" varchar DEFAULT 'todo',
      "priority" varchar DEFAULT 'medium',
      "assignees" jsonb,
      "due_date" timestamp(3) with time zone,
      "position" numeric DEFAULT 0,
      "labels" jsonb,
      "checklist" jsonb,
      "created_by_id" integer,
      "completed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE "project_task_comments" (
      "id" serial PRIMARY KEY NOT NULL,
      "task_id" integer NOT NULL,
      "author_id" integer NOT NULL,
      "body" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE "project_activity" (
      "id" serial PRIMARY KEY NOT NULL,
      "project_id" integer NOT NULL,
      "task" numeric,
      "actor_id" integer,
      "action" varchar NOT NULL,
      "summary" varchar NOT NULL,
      "meta" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "project_task_comments" ADD CONSTRAINT "project_task_comments_task_id_project_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "project_task_comments" ADD CONSTRAINT "project_task_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "project_tasks_project_idx" ON "project_tasks" USING btree ("project_id");
    CREATE INDEX "project_tasks_status_idx" ON "project_tasks" USING btree ("status");
    CREATE INDEX "project_tasks_updated_at_idx" ON "project_tasks" USING btree ("updated_at");
    CREATE INDEX "project_tasks_created_at_idx" ON "project_tasks" USING btree ("created_at");
    CREATE INDEX "project_task_comments_task_idx" ON "project_task_comments" USING btree ("task_id");
    CREATE INDEX "project_task_comments_updated_at_idx" ON "project_task_comments" USING btree ("updated_at");
    CREATE INDEX "project_task_comments_created_at_idx" ON "project_task_comments" USING btree ("created_at");
    CREATE INDEX "project_activity_project_idx" ON "project_activity" USING btree ("project_id");
    CREATE INDEX "project_activity_task_idx" ON "project_activity" USING btree ("task");
    CREATE INDEX "project_activity_updated_at_idx" ON "project_activity" USING btree ("updated_at");
    CREATE INDEX "project_activity_created_at_idx" ON "project_activity" USING btree ("created_at");

    ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp(3) with time zone, ADD COLUMN "show_presence" boolean DEFAULT true;

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN "project_tasks_id" integer,
      ADD COLUMN "project_task_comments_id" integer,
      ADD COLUMN "project_activity_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_tasks_fk" FOREIGN KEY ("project_tasks_id") REFERENCES "public"."project_tasks"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_task_comments_fk" FOREIGN KEY ("project_task_comments_id") REFERENCES "public"."project_task_comments"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_activity_fk" FOREIGN KEY ("project_activity_id") REFERENCES "public"."project_activity"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_project_tasks_id_idx" ON "payload_locked_documents_rels" USING btree ("project_tasks_id");
    CREATE INDEX "payload_locked_documents_rels_project_task_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("project_task_comments_id");
    CREATE INDEX "payload_locked_documents_rels_project_activity_id_idx" ON "payload_locked_documents_rels" USING btree ("project_activity_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN "project_tasks_id",
      DROP COLUMN "project_task_comments_id",
      DROP COLUMN "project_activity_id";
    ALTER TABLE "users" DROP COLUMN "last_seen_at", DROP COLUMN "show_presence";
    DROP TABLE "project_activity";
    DROP TABLE "project_task_comments";
    DROP TABLE "project_tasks";
  `)
}
