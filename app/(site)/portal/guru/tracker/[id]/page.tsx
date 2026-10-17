import config from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import TrackerBoard from '../../../../../../components/tracker/TrackerBoard'

export const dynamic = 'force-dynamic'

export default async function TrackerProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let user: { collection?: string; role?: unknown; id: string | number } | null = null
  try { user = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user }
  catch { redirect('/login') }
  if (!user || user.collection !== 'users' || !['student', 'teacher'].includes(String(user.role))) redirect('/login')
  if (user.role !== 'teacher') redirect(user.role === 'teacher' ? '/portal/guru/tracker' : '/portal/siswa/tracker')
  const { id } = await params
  return <main className="tk-page"><TrackerBoard projectID={Number(id)} role="teacher" meID={Number(user.id)} /></main>
}
