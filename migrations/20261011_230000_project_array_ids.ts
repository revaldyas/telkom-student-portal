import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Store Payload-generated array row IDs without truncating their string identifiers. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."projects_members" ALTER COLUMN "id" DROP DEFAULT;
    ALTER TABLE "public"."projects_members" ALTER COLUMN "id" TYPE varchar USING "id"::varchar;
    ALTER TABLE "public"."projects_mentor_assignments" ALTER COLUMN "id" DROP DEFAULT;
    ALTER TABLE "public"."projects_mentor_assignments" ALTER COLUMN "id" TYPE varchar USING "id"::varchar;
    ALTER TABLE "public"."projects_review_history" ALTER COLUMN "id" DROP DEFAULT;
    ALTER TABLE "public"."projects_review_history" ALTER COLUMN "id" TYPE varchar USING "id"::varchar;
  `)
}

// Preserve the string IDs when rolling back; they cannot safely be converted to serial IDs.
export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Rollback ID array proyek memerlukan pemetaan data khusus.')
}
