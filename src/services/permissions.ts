import type { AppUser, GoogleIdentity, UserRole } from '../types/user'

export function canWrite(user: AppUser | null | undefined): boolean {
  return user?.role === 'writer' || user?.role === 'admin'
}

export function canAdmin(user: AppUser | null | undefined): boolean {
  return user?.role === 'admin'
}

export function canEditPost(user: AppUser | null | undefined, authorId: string): boolean {
  return Boolean(user && (user.role === 'admin' || (canWrite(user) && user.id === authorId)))
}

export function initialRoleForIdentity(
  identity: GoogleIdentity,
  bootstrap: { googleSubject?: string; email?: string } = {
    googleSubject: import.meta.env.VITE_INITIAL_ADMIN_GOOGLE_SUB,
    email: import.meta.env.VITE_INITIAL_ADMIN_EMAIL,
  },
): UserRole {
  const configuredSubject = bootstrap.googleSubject?.trim()
  const configuredEmail = bootstrap.email?.trim().toLowerCase()

  if (configuredSubject) return identity.googleSubject === configuredSubject ? 'admin' : 'viewer'
  if (configuredEmail && identity.emailVerified && identity.email.toLowerCase() === configuredEmail) return 'admin'
  return 'viewer'
}

export function canChangeRole(actor: AppUser, target: AppUser, nextRole: UserRole): boolean {
  if (!canAdmin(actor) || actor.id === target.id || target.role === 'admin') return false
  return (target.role === 'viewer' && nextRole === 'writer') || (target.role === 'writer' && nextRole === 'viewer')
}