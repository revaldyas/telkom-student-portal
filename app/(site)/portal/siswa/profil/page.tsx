import config from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import ProfileEditorPage from './ProfileEditorPage'

export const dynamic = 'force-dynamic'

export default async function StudentProfilePage() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let user: { collection?: string; role?: unknown; id: string | number } | null = null
  try { user = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user }
  catch { redirect('/login') }
  if (!user || user.collection !== 'users' || !['student', 'teacher'].includes(String(user.role))) redirect('/login')
  if (user.role === 'teacher') redirect('/portal/guru')

  const student = await payload.findByID({ collection: 'users', id: user.id, depth: 1, overrideAccess: true })
  const photo = student.profilePhoto && typeof student.profilePhoto === 'object' ? student.profilePhoto.url || null : null
  return <ProfileEditorPage profile={{
    id: student.id,
    name: student.name,
    bio: student.bio || '',
    interests: student.interests || [],
    skills: student.skills || [],
    experiences: student.experiences || [],
    photoURL: photo,
    className: student.class && typeof student.class === 'object' ? student.class.name : null,
    programName: student.program && typeof student.program === 'object' ? student.program.name : null,
  }} />
}
