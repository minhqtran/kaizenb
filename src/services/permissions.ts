import type { AppUser } from '../types/user'

export function canWrite(user: AppUser | null | undefined): boolean {
  return user?.role === 'writer' || user?.role === 'admin'
}

export function canAdmin(user: AppUser | null | undefined): boolean {
  return user?.role === 'admin'
}

export function canEditPost(user: AppUser | null | undefined, authorId: string): boolean {
  return Boolean(user && (user.role === 'admin' || (canWrite(user) && user.id === authorId)))
}
