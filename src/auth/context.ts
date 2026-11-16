import { createContext } from "react";
import type { AppUser, UserRole } from "../types/user";

export interface AuthContextValue {
  user: AppUser | null;
  users: AppUser[];
  loading: boolean;
  error: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setUserRole: (targetId: string, role: UserRole) => Promise<void>;
  updateProfile: (
    nickname: string,
    profileImageKey: string | null,
  ) => Promise<AppUser>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
