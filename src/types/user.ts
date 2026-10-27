export type UserRole = 'viewer' | 'writer' | 'admin'

export interface AppUser {
  id: string
  googleSubject: string
  email: string
  displayName: string
  avatarUrl?: string
  role: UserRole
}

export interface GoogleIdentity {
  googleSubject: string
  email: string
  emailVerified: boolean
  displayName: string
  avatarUrl?: string
}