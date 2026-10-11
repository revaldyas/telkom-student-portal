import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Allow multiple review entries per portfolio so feedback remains auditable. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."portfolio_reviews_portfolio_idx";
    DROP INDEX IF EXISTS "public"."portfolio_reviews_review_key_idx";
    CREATE INDEX "portfolio_reviews_portfolio_idx" ON "portfolio_reviews" USING btree ("portfolio_id");
    CREATE INDEX "portfolio_reviews_review_key_idx" ON "portfolio_reviews" USING btree ("review_key");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."portfolio_reviews_portfolio_idx";
    DROP INDEX IF EXISTS "public"."portfolio_reviews_review_key_idx";
    CREATE UNIQUE INDEX "portfolio_reviews_portfolio_idx" ON "portfolio_reviews" USING btree ("portfolio_id");
    CREATE UNIQUE INDEX "portfolio_reviews_review_key_idx" ON "portfolio_reviews" USING btree ("review_key");
  `)
}
