import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Personalisasi profil publik: cover, pola, warna aksen, bentuk foto, dan tagline. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_users_appearance_cover_mode" AS ENUM ('gradient', 'image');
    CREATE TYPE "public"."enum_users_appearance_avatar_shape" AS ENUM ('circle', 'rounded');
    ALTER TABLE "users"
      ADD COLUMN "appearance_cover_mode" "enum_users_appearance_cover_mode" DEFAULT 'gradient',
      ADD COLUMN "appearance_gradient" varchar DEFAULT 'telkom',
      ADD COLUMN "appearance_pattern" varchar DEFAULT 'dots',
      ADD COLUMN "appearance_accent" varchar DEFAULT '#e50914',
      ADD COLUMN "appearance_avatar_shape" "enum_users_appearance_avatar_shape" DEFAULT 'circle',
      ADD COLUMN "appearance_tagline" varchar,
      ADD COLUMN "appearance_cover_image_id" integer;
    ALTER TABLE "users" ADD CONSTRAINT "users_appearance_cover_image_id_uploads_id_fk" FOREIGN KEY ("appearance_cover_image_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "users_appearance_cover_image_idx" ON "users" USING btree ("appearance_cover_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "users_appearance_cover_image_idx";
    ALTER TABLE "users" DROP CONSTRAINT "users_appearance_cover_image_id_uploads_id_fk";
    ALTER TABLE "users"
      DROP COLUMN "appearance_cover_mode",
      DROP COLUMN "appearance_gradient",
      DROP COLUMN "appearance_pattern",
      DROP COLUMN "appearance_accent",
      DROP COLUMN "appearance_avatar_shape",
      DROP COLUMN "appearance_tagline",
      DROP COLUMN "appearance_cover_image_id";
    DROP TYPE "public"."enum_users_appearance_cover_mode";
    DROP TYPE "public"."enum_users_appearance_avatar_shape";
  `)
}
