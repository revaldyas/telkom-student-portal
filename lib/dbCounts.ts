import { sql } from '@payloadcms/db-postgres'
import type { BasePayload } from 'payload'

type Drizzle = { execute: (query: unknown) => Promise<{ rows: Record<string, unknown>[] }> }
const drizzleOf = (payload: BasePayload) => (payload.db as unknown as { drizzle: Drizzle }).drizzle

/**
 * Menghitung baris per kunci langsung di database (satu round trip, hasil kecil)
 * menggantikan pola "ambil semua baris lalu hitung di JS".
 * `table` dan `column` berasal dari kode (bukan input pengguna).
 */
export async function groupCount(payload: BasePayload, table: string, column: string, ids?: number[]) {
  const counts = new Map<number, number>()
  if (ids && !ids.length) return counts
  const filter = ids ? sql` WHERE ${sql.identifier(column)} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})` : sql``
  const result = await drizzleOf(payload).execute(sql`SELECT ${sql.identifier(column)} AS key, count(*)::int AS total FROM ${sql.identifier(table)}${filter} GROUP BY ${sql.identifier(column)}`)
  for (const row of result.rows) counts.set(Number(row.key), Number(row.total))
  return counts
}

/** Jumlah suara per (penghargaan, karya). */
export async function awardVoteCounts(payload: BasePayload) {
  const result = await drizzleOf(payload).execute(sql`SELECT award_id, portfolio_id, count(*)::int AS total FROM "award_votes" GROUP BY award_id, portfolio_id`)
  const map = new Map<string, number>()
  for (const row of result.rows) map.set(`${row.award_id}:${row.portfolio_id}`, Number(row.total))
  return map
}

/** Pesan belum dibaca per percakapan untuk satu pengguna, dalam satu query. */
export async function unreadByConversation(payload: BasePayload, userID: number) {
  const result = await drizzleOf(payload).execute(sql`
    SELECT m.conversation_id AS id, count(msg.id)::int AS unread
    FROM "chat_members" m
    JOIN "chat_messages" msg ON msg.conversation_id = m.conversation_id AND msg.id > COALESCE(m.last_read_id, 0) AND msg.sender_id <> ${userID} AND COALESCE(msg.deleted, false) = false
    WHERE m.user_id = ${userID} AND m.status = 'active'
    GROUP BY m.conversation_id`)
  const map = new Map<number, number>()
  for (const row of result.rows) map.set(Number(row.id), Number(row.unread))
  return map
}
