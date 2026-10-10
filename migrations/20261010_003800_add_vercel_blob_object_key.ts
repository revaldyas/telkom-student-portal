import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "uploads" ADD COLUMN IF NOT EXISTS "_objectkey" varchar`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "uploads" DROP COLUMN IF EXISTS "_objectkey"`)
}
