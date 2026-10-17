import config from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { appearanceFromUser } from '../../../../../lib/appearanceFromUser'
import AppearanceEditorPage from '../../siswa/tampilan/AppearanceEditorPage'

export const dynamic = 'force-dynamic'

export default async function TeacherAppearancePage() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let user: { collection?: string; role?: unknown; id: string | number } | null = null
  try { user = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user }
  catch { redirect('/login') }
  if (!user || user.collection !== 'users' || !['student', 'teacher'].includes(String(user.role))) redirect('/login')
  if (user.role === 'student') redirect('/portal/siswa/tampilan')

  const teacher = await payload.findByID({ collection: 'users', id: user.id, depth: 1, overrideAccess: true })
  const photo = teacher.profilePhoto && typeof teacher.profilePhoto === 'object' ? teacher.profilePhoto.url || null : null
  const cover = teacher.appearance?.coverImage
  const coverID = cover && typeof cover === 'object' ? cover.id : cover ?? null
  return <AppearanceEditorPage role="teacher" profile={{ id: teacher.id, name: teacher.name, photoURL: photo, subtitle: 'Guru pembimbing' }} initial={appearanceFromUser(teacher)} initialCoverID={coverID} />
}
