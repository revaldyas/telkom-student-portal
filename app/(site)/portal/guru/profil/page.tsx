import config from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { appearanceFromUser } from '../../../../../lib/appearanceFromUser'
import ProfileEditorPage from '../../siswa/profil/ProfileEditorPage'

export const dynamic = 'force-dynamic'

export default async function TeacherProfilePage() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let user: { collection?: string; role?: unknown; id: string | number } | null = null
  try { user = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user }
  catch { redirect('/login') }
  if (!user || user.collection !== 'users' || !['student', 'teacher'].includes(String(user.role))) redirect('/login')
  if (user.role === 'student') redirect('/portal/siswa/profil')

  const teacher = await payload.findByID({ collection: 'users', id: user.id, depth: 1, overrideAccess: true })
  const photo = teacher.profilePhoto && typeof teacher.profilePhoto === 'object' ? teacher.profilePhoto.url || null : null
  return <ProfileEditorPage role="teacher" profile={{
    id: teacher.id, name: teacher.name, bio: teacher.bio || '',
    interests: teacher.interests || [], skills: teacher.skills || [], experiences: teacher.experiences || [],
    photoURL: photo, className: teacher.class && typeof teacher.class === 'object' ? teacher.class.name : 'Guru pembimbing',
    programName: teacher.program && typeof teacher.program === 'object' ? teacher.program.name : null,
  }} appearance={appearanceFromUser(teacher)} />
}
