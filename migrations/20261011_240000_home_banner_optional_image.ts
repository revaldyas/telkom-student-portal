import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Allow CMS hero banners to use the frontend skeleton until artwork is added. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "public"."home_banners" ALTER COLUMN "image_id" DROP NOT NULL`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "public"."home_banners" ALTER COLUMN "image_id" SET NOT NULL`)
}
