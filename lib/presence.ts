import { sql } from '@payloadcms/db-postgres'
import type { BasePayload } from 'payload'

/** Memperbarui "terakhir terlihat" langsung lewat SQL agar tidak memicu validasi dokumen pengguna. */
export async function touchPresence(payload: BasePayload, userID: number) {
  const drizzle = (payload.db as unknown as { drizzle: { execute: (query: unknown) => Promise<unknown> } }).drizzle
  await drizzle.execute(sql`UPDATE "users" SET "last_seen_at" = now() WHERE "id" = ${userID}`)
}
