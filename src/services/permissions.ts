<<<<<<< HEAD
import type { AppUser } from '../types/user'
=======
import type { AppUser, UserRole } from '../types/user'
>>>>>>> e37e27e (let's see)

export function canWrite(user: AppUser | null | undefined): boolean {
  return user?.role === 'writer' || user?.role === 'admin'
}

export function canAdmin(user: AppUser | null | undefined): boolean {
  return user?.role === 'admin'
}

export function canEditPost(user: AppUser | null | undefined, authorId: string): boolean {
  return Boolean(user && (user.role === 'admin' || (canWrite(user) && user.id === authorId)))
}
<<<<<<< HEAD
=======

export function canChangeRole(actor: AppUser, target: AppUser, nextRole: UserRole): boolean {
  if (!canAdmin(actor) || actor.id === target.id || target.role === 'admin') return false
  return (target.role === 'viewer' && nextRole === 'writer') || (target.role === 'writer' && nextRole === 'viewer')
}
>>>>>>> e37e27e (let's see)
