import { beforeEach, describe, expect, it, vi } from 'vitest'
import { changeUserRole, getSessionUser, getUsers, signInUser, signOutUser } from './users'

function installStorage() {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
  vi.stubGlobal('window', new EventTarget())
}

describe('local user repository', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    installStorage()
  })

  it('restores a signed-in profile and defaults it to viewer', () => {
    const user = signInUser({ googleSubject: 'stable-google-sub', email: 'reader@example.test', emailVerified: true, displayName: 'Reader' })
    expect(user).toMatchObject({ id: 'stable-google-sub', googleSubject: 'stable-google-sub', role: 'viewer' })
    expect(getSessionUser()).toEqual(user)
    expect(getUsers()).toEqual([user])
    signOutUser()
    expect(getSessionUser()).toBeNull()
  })

  it('allows only an existing admin to promote viewers, never self-promote', () => {
    const admin = { id: 'google-admin', googleSubject: 'google-admin', email: 'admin@example.test', displayName: 'Admin', role: 'admin' }
    const reader = { id: 'google-reader', googleSubject: 'google-reader', email: 'reader@example.test', displayName: 'Reader', role: 'viewer' }
    localStorage.setItem('goodword.users.v1', JSON.stringify([admin, reader]))
    expect(() => changeUserRole(reader.id, admin.id, 'admin')).toThrow('not allowed')
    expect(() => changeUserRole(admin.id, admin.id, 'writer')).toThrow('not allowed')
    expect(changeUserRole(admin.id, reader.id, 'writer')[1].role).toBe('writer')
  })
})