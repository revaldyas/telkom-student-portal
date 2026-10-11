export const isTeacherUser = (user: unknown): user is { collection: 'users'; id: string | number; role: 'teacher' } =>
  Boolean(user && typeof user === 'object' && 'collection' in user && 'role' in user && (user as { collection?: unknown; role?: unknown }).collection === 'users' && (user as { role?: unknown }).role === 'teacher')
