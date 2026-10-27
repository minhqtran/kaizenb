import { createContext } from 'react'
import type { AppUser, GoogleIdentity, UserRole } from '../types/user'

export interface AuthContextValue {
  user: AppUser | null
  users: AppUser[]
  signIn: (identity: GoogleIdentity) => AppUser
  signOut: () => void
  setUserRole: (targetId: string, role: UserRole) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)