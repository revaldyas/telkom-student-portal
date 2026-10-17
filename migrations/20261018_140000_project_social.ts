import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Suka dan komentar proyek (untuk peringkat proyek). */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "project_likes" (
      "id" serial PRIMARY KEY NOT NULL,
      "project_id" integer NOT NULL,
      "user_id" integer NOT NULL,
      "like_key" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE "project_comments" (
      "id" serial PRIMARY KEY NOT NULL,
      "project_id" integer NOT NULL,
      "author_id" integer NOT NULL,
      "body" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "project_likes_project_idx" ON "project_likes" USING btree ("project_id");
    CREATE INDEX "project_likes_user_idx" ON "project_likes" USING btree ("user_id");
    CREATE UNIQUE INDEX "project_likes_like_key_idx" ON "project_likes" USING btree ("like_key");
    CREATE INDEX "project_likes_updated_at_idx" ON "project_likes" USING btree ("updated_at");
    CREATE INDEX "project_likes_created_at_idx" ON "project_likes" USING btree ("created_at");
    CREATE INDEX "project_comments_project_idx" ON "project_comments" USING btree ("project_id");
    CREATE INDEX "project_comments_updated_at_idx" ON "project_comments" USING btree ("updated_at");
    CREATE INDEX "project_comments_created_at_idx" ON "project_comments" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN "project_likes_id" integer,
      ADD COLUMN "project_comments_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_likes_fk" FOREIGN KEY ("project_likes_id") REFERENCES "public"."project_likes"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_comments_fk" FOREIGN KEY ("project_comments_id") REFERENCES "public"."project_comments"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_project_likes_id_idx" ON "payload_locked_documents_rels" USING btree ("project_likes_id");
    CREATE INDEX "payload_locked_documents_rels_project_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("project_comments_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN "project_likes_id",
      DROP COLUMN "project_comments_id";
    DROP TABLE "project_comments";
    DROP TABLE "project_likes";
  `)
}
