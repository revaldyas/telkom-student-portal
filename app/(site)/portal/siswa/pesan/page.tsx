import config from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import ChatApp from '../../../../../components/chat/ChatApp'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let user: { collection?: string; role?: unknown; id: string | number; name?: string; profilePhoto?: unknown } | null = null
  try { user = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user }
  catch { redirect('/login') }
  if (!user || user.collection !== 'users' || !['student', 'teacher'].includes(String(user.role))) redirect('/login')
  if (user.role !== 'student') redirect(user.role === 'teacher' ? '/portal/guru/pesan' : '/portal/siswa/pesan')
  const photo = user.profilePhoto && typeof user.profilePhoto === 'object' ? (user.profilePhoto as { url?: string }).url || null : null
  return <main className="ch-page"><ChatApp me={{ id: Number(user.id), name: user.name || 'Saya', photo, role: user.role as 'student' | 'teacher' }} /></main>
}
