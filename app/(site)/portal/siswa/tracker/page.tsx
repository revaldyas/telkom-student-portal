import config from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import TrackerHome from '../../../../../components/tracker/TrackerHome'

export const dynamic = 'force-dynamic'

export default async function TrackerPage() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let user: { collection?: string; role?: unknown; id: string | number } | null = null
  try { user = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user }
  catch { redirect('/login') }
  if (!user || user.collection !== 'users' || !['student', 'teacher'].includes(String(user.role))) redirect('/login')
  if (user.role !== 'student') redirect(user.role === 'teacher' ? '/portal/guru/tracker' : '/portal/siswa/tracker')
  return <main className="tk-page"><TrackerHome role="student" meID={Number(user.id)} name={String((user as { name?: string }).name || 'Kamu')} /></main>
}
