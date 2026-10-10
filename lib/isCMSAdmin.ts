type AuthenticatedCollectionUser = { collection?: string } | null | undefined

export const isCMSAdmin = (user: AuthenticatedCollectionUser) => user?.collection === 'admins'
