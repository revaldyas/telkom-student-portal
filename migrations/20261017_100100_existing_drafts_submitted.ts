import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Sebelum fitur draf, membuat karya sama dengan mengajukannya. Karya draf yang sudah ada dipindahkan
 * ke "submitted" agar tetap berada di antrean Guru. Dipisah dari migrasi sebelumnya karena nilai enum
 * baru tidak boleh dipakai di transaksi yang sama dengan ALTER TYPE.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "public"."portfolios"
    SET "verification_status" = 'submitted'
    WHERE "status" = 'draft' AND ("verification_status" = 'unreviewed' OR "verification_status" IS NULL)
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`UPDATE "public"."portfolios" SET "verification_status" = 'unreviewed' WHERE "verification_status" = 'submitted'`)
}
