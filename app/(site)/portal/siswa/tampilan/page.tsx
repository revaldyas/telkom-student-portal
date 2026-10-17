import config from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { appearanceFromUser } from '../../../../../lib/appearanceFromUser'
import AppearanceEditorPage from './AppearanceEditorPage'

export const dynamic = 'force-dynamic'

export default async function StudentAppearancePage() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let user: { collection?: string; role?: unknown; id: string | number } | null = null
  try { user = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user }
  catch { redirect('/login') }
  if (!user || user.collection !== 'users' || !['student', 'teacher'].includes(String(user.role))) redirect('/login')
  if (user.role === 'teacher') redirect('/portal/guru/tampilan')

  const student = await payload.findByID({ collection: 'users', id: user.id, depth: 1, overrideAccess: true })
  const photo = student.profilePhoto && typeof student.profilePhoto === 'object' ? student.profilePhoto.url || null : null
  const cover = student.appearance?.coverImage
  const coverID = cover && typeof cover === 'object' ? cover.id : cover ?? null
  return <AppearanceEditorPage
    profile={{
      id: student.id, name: student.name, photoURL: photo,
      subtitle: [typeof student.class === 'object' && student.class ? student.class.name : 'Siswa', typeof student.program === 'object' && student.program ? student.program.name : ''].filter(Boolean).join(' · '),
    }}
    initial={appearanceFromUser(student)}
    initialCoverID={coverID}
  />
}
