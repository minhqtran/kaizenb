export type UserRole = 'viewer' | 'writer' | 'admin'

export interface AppUser {
  id: string
  googleSubject: string
  email: string
  displayName: string
  avatarUrl?: string
  nickname?: string
  profileImageKey?: string
  role: UserRole
}

export function effectiveDisplayName(user: Pick<AppUser, 'displayName' | 'nickname'>): string {
  return user.nickname?.trim() || user.displayName
}

export interface GoogleIdentity {
  googleSubject: string
  email: string
  emailVerified: boolean
  displayName: string
  avatarUrl?: string
}