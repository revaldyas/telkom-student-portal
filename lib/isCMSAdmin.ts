export const isCMSAdmin = (user: unknown): user is { collection: 'admins'; id: string | number } =>
  Boolean(user && typeof user === 'object' && 'collection' in user && (user as { collection?: unknown }).collection === 'admins')
