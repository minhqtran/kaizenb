import { useState } from 'react'
import type { ReactNode } from 'react'
import type { AppUser, GoogleIdentity, UserRole } from '../types/user'
import { changeUserRole, getSessionUser, getUsers, signInUser, signOutUser, updateUserProfile } from '../services/users'
import { disableGoogleAutoSelect } from '../services/googleIdentity'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => getSessionUser())
  const [users, setUsers] = useState<AppUser[]>(() => getUsers())

  function signIn(identity: GoogleIdentity) {
    const nextUser = signInUser(identity)
    setUser(nextUser)
    setUsers(getUsers())
    return nextUser
  }

  function signOut() {
    signOutUser()
    disableGoogleAutoSelect()
    setUser(null)
  }

  function setUserRole(targetId: string, role: UserRole) {
    if (!user) throw new Error('Sign in before managing users.')
    setUsers(changeUserRole(user.id, targetId, role))
  }

  function updateProfile(nickname: string, profileImageKey: string | null) {
    if (!user) throw new Error('Sign in before updating your profile.')
    const updatedUser = updateUserProfile(user.id, nickname, profileImageKey)
    setUser(updatedUser)
    setUsers(getUsers())
    return updatedUser
  }

  return <AuthContext.Provider value={{ user, users, signIn, signOut, setUserRole, updateProfile }}>{children}</AuthContext.Provider>
}