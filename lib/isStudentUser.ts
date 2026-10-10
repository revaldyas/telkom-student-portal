type StudentUser = { id: string | number; role: 'student' }

export const isStudentUser = (user: unknown): user is StudentUser => {
  if (!user || typeof user !== 'object' || !('id' in user) || !('role' in user)) return false
  const { id, role } = user as { id?: unknown; role?: unknown }
  return (typeof id === 'string' || typeof id === 'number') && role === 'student'
}
