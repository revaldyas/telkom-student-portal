import { sql } from '@payloadcms/db-postgres'
import type { BasePayload } from 'payload'

/**
 * Transaksi aktif untuk test yang sedang berjalan. Selama `txState.id` terisi, setiap operasi Payload
 * (termasuk yang dipanggil dari handler route) otomatis ikut transaksi ini, lalu di-rollback di akhir.
 *
 * Dua hal yang dijaga di sini:
 * 1. Operasi Payload yang gagal memanggil `killTransaction`, yang akan me-rollback transaksi bersama dan
 *    membuat operasi berikutnya jatuh ke koneksi biasa (autocommit = data tersimpan permanen). Karena itu
 *    `guardTransaction` membuat rollback dari Payload diabaikan; hanya `rollback()` milik test yang berlaku.
 * 2. Error di level database (mis. pelanggaran unique) membuat transaksi Postgres "aborted". Setiap operasi
 *    tulis dibungkus SAVEPOINT supaya test berikutnya tetap bisa jalan.
 */
export const txState: { id?: string | number; releasing?: boolean } = {}

const READS = new Set(['find', 'findByID', 'count', 'findDistinct'])
const WRITES = new Set(['create', 'update', 'delete', 'login'])

export function guardTransaction(payload: BasePayload) {
  const db = payload.db as unknown as { rollbackTransaction: (id?: string | number) => Promise<void>; __guarded?: boolean }
  if (db.__guarded) return
  const original = db.rollbackTransaction.bind(db)
  db.rollbackTransaction = async (id) => {
    if (id !== undefined && id === txState.id && !txState.releasing) return
    return original(id)
  }
  db.__guarded = true
  // lib/dbCounts menjalankan SQL lewat payload.db.drizzle, di luar API Payload. Selama transaksi test aktif,
  // arahkan ke sesi transaksi yang sama supaya data test terlihat oleh hitungan itu.
  const target = payload.db as unknown as { drizzle: unknown; sessions: Record<string, { db: unknown }> }
  const pool = target.drizzle
  Object.defineProperty(target, 'drizzle', {
    configurable: true,
    get: () => (txState.id !== undefined && target.sessions[String(txState.id)]?.db) || pool,
    set: () => undefined,
  })
}

let queue: Promise<unknown> = Promise.resolve()
let savepoints = 0

function inSavepoint<T>(payload: BasePayload, run: () => Promise<T>): Promise<T> {
  const result = queue.then(async () => {
    const session = (payload.db as unknown as { sessions: Record<string, { db: { execute: (query: unknown) => Promise<unknown> } }> }).sessions[String(txState.id)]
    if (!session) throw new Error('Transaksi test sudah berakhir; operasi dihentikan agar tidak tersimpan permanen.')
    const name = `sp_${++savepoints}`
    await session.db.execute(sql.raw(`SAVEPOINT ${name}`))
    try {
      const value = await run()
      await session.db.execute(sql.raw(`RELEASE SAVEPOINT ${name}`))
      return value
    } catch (error) {
      await session.db.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${name}`))
      throw error
    }
  })
  queue = result.catch(() => undefined)
  return result
}

export function withTx<T extends BasePayload>(payload: T): T {
  return new Proxy(payload, {
    get(target, key) {
      const value = Reflect.get(target, key, target)
      if (typeof value !== 'function') return value
      if (typeof key !== 'string' || (!READS.has(key) && !WRITES.has(key))) return value.bind(target)
      return (args: Record<string, unknown> = {}) => {
        if (txState.id === undefined) return value.call(target, args)
        const req = args.req as Record<string, unknown> | undefined
        const call = () => {
          if (req) { req.transactionID ??= txState.id; return value.call(target, args) }
          return value.call(target, { ...args, req: { transactionID: txState.id } })
        }
        return WRITES.has(key) ? inSavepoint(target, call) : call()
      }
    },
  })
}
