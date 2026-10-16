import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Dukungan draf: karya mendapat status verifikasi "submitted" (diajukan), dan isian selain judul/nama
 * tidak lagi wajib di level database agar draf yang belum lengkap bisa disimpan. Kelengkapan dicek
 * oleh hook saat karya diajukan atau diterbitkan.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_portfolios_verification_status" ADD VALUE IF NOT EXISTS 'submitted';
    ALTER TABLE "public"."portfolios" ALTER COLUMN "summary" DROP NOT NULL;
    ALTER TABLE "public"."portfolios" ALTER COLUMN "category_ref_id" DROP NOT NULL;
    ALTER TABLE "public"."projects" ALTER COLUMN "summary" DROP NOT NULL;
    ALTER TABLE "public"."opportunities" ALTER COLUMN "type" DROP NOT NULL;
    ALTER TABLE "public"."opportunities" ALTER COLUMN "organizer" DROP NOT NULL;
    ALTER TABLE "public"."opportunities" ALTER COLUMN "summary" DROP NOT NULL;
  `)
}

// Label enum PostgreSQL tidak bisa dihapus dengan aman, dan kolom yang sudah berisi NULL tidak bisa kembali NOT NULL.
export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Rollback dukungan draf memerlukan migrasi data terpisah.')
}
