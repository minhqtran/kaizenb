import type { AppUser, GoogleIdentity, UserRole } from '../types/user'
import { effectiveDisplayName } from '../types/user'
import { canChangeRole, initialRoleForIdentity } from './permissions'
import { updatePostsAuthorProfile } from './posts'

const usersKey = 'goodword.users.v1'
const sessionKey = 'goodword.session.v1'

function readUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(usersKey)
    const users: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(users) ? users as AppUser[] : []
  } catch {
    return []
  }
}

function writeUsers(users: AppUser[]) {
  localStorage.setItem(usersKey, JSON.stringify(users))
  window.dispatchEvent(new Event('goodword-users-changed'))
}

export function getUsers(): AppUser[] {
  return readUsers()
}

export function getSessionUser(): AppUser | null {
  const id = localStorage.getItem(sessionKey)
  return id ? readUsers().find((user) => user.id === id) ?? null : null
}

export function signInUser(identity: GoogleIdentity): AppUser {
  const users = readUsers()
  const existing = users.find((user) => user.googleSubject === identity.googleSubject)
  const configuredRole = initialRoleForIdentity(identity)
  const role: UserRole = configuredRole === 'admin'
    ? 'admin'
    : existing?.role === 'admin' ? 'viewer' : existing?.role ?? 'viewer'
  const user: AppUser = {
    id: identity.googleSubject,
    googleSubject: identity.googleSubject,
    email: identity.email,
    displayName: identity.displayName,
    ...(identity.avatarUrl ? { avatarUrl: identity.avatarUrl } : existing?.avatarUrl ? { avatarUrl: existing.avatarUrl } : {}),
    ...(existing?.nickname ? { nickname: existing.nickname } : {}),
    ...(existing?.profileImageKey ? { profileImageKey: existing.profileImageKey } : {}),
    role,
  }
  writeUsers(existing ? users.map((entry) => entry.id === user.id ? user : entry) : [...users, user])
  localStorage.setItem(sessionKey, user.id)
  return user
}

export function signOutUser() {
  localStorage.removeItem(sessionKey)
}

export function changeUserRole(actorId: string, targetId: string, nextRole: UserRole): AppUser[] {
  const users = readUsers()
  const actor = users.find((user) => user.id === actorId)
  const target = users.find((user) => user.id === targetId)
  if (!actor || !target || !canChangeRole(actor, target, nextRole)) {
    throw new Error('You are not allowed to change this role.')
  }
  const updated = users.map((user) => user.id === targetId ? { ...user, role: nextRole } : user)
  writeUsers(updated)
  return updated
}

export function updateUserProfile(actorId: string, nickname: string, profileImageKey: string | null): AppUser {
  const users = readUsers()
  const actor = users.find((user) => user.id === actorId)
  const normalizedNickname = nickname.trim()
  if (!actor) throw new Error('Sign in before updating your profile.')
  if (!normalizedNickname || normalizedNickname.length > 40) throw new Error('Nickname must be between 1 and 40 characters.')

  const updated: AppUser = { ...actor, nickname: normalizedNickname, profileImageKey: profileImageKey ?? undefined }
  writeUsers(users.map((user) => user.id === actorId ? updated : user))
  updatePostsAuthorProfile(actorId, effectiveDisplayName(updated), updated.avatarUrl, profileImageKey ?? undefined)
  return updated
}