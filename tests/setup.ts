import { vi } from 'vitest'
import { loadEnv } from 'payload/node'
import { txState, withTx } from './harness'

// Konfigurasi Payload membaca env saat diimpor (termasuk lewat handler route), jadi env harus dimuat lebih dulu.
loadEnv()

// getPayload mengembalikan instance yang otomatis memakai transaksi test aktif.
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: async (args: Parameters<typeof actual.getPayload>[0]) => withTx(await actual.getPayload(args)),
    createLocalReq: async (...args: Parameters<typeof actual.createLocalReq>) => {
      const req = await actual.createLocalReq(...args)
      if (txState.id !== undefined) req.transactionID = txState.id
      return req
    },
  }
})

// Sesi website tidak bisa dibuat di dalam transaksi (JWT hanya valid untuk user yang sudah commit),
// jadi identitas pemanggil dibaca dari header `x-test-user` dan dicari di dalam transaksi.
vi.mock('../lib/websiteAuth', () => ({
  authenticateWebsiteRequest: async (payload: import('payload').BasePayload, request: Request) => {
    const id = request.headers.get('x-test-user')
    if (!id) return null
    const user = await payload.findByID({ collection: 'users', id: Number(id), depth: 1, overrideAccess: true }).catch(() => null)
    return user && ['student', 'teacher'].includes(String(user.role)) ? { ...user, collection: 'users' } : null
  },
}))
