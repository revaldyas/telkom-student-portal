import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Add program-specific legacy category values while category relations are backfilled. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TR-TRANSMISI';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TR-OPTIK';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TR-SINYAL';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TR-TELEKOM';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TJKT-TOPOLOGI';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TJKT-SERVER';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TJKT-KEAMANAN';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TJKT-HARDWARE';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TJA-FTTH';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TJA-ODP';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TJA-WIRELESS';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'TJA-LAYANAN';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'PPLG-WEB';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'PPLG-MOBILE';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'PPLG-GAME';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'PPLG-UIUX';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'DKV-BRAND';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'DKV-GRAFIS';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'DKV-FOTO';
    ALTER TYPE "public"."enum_portfolios_category" ADD VALUE IF NOT EXISTS 'DKV-MOTION';
  `)
}

// PostgreSQL enum labels cannot be safely removed without rewriting existing rows.
export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Rollback label enum kategori memerlukan migrasi data terpisah.')
}
