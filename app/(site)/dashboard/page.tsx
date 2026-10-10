import config from '@payload-config'
import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')

  let authenticatedUser: { collection?: string; role?: unknown; id: string | number } | null = null
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({
      headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }),
    })
    authenticatedUser = user
  } catch {
    return <main className="lowfi-shell"><section className="lowfi-content"><h1>Dashboard belum dapat dibuka</h1><p>Sesi belum dapat diperiksa karena server sedang bermasalah. Akunmu belum dikeluarkan.</p><Link href="/dashboard">Coba lagi</Link></section></main>
  }

  if (!authenticatedUser || authenticatedUser.collection !== 'users' || !['student', 'teacher'].includes(String(authenticatedUser.role))) redirect('/login')
  if (authenticatedUser.role === 'teacher') redirect('/awards')
  redirect(`/siswa/${authenticatedUser.id}`)
}
