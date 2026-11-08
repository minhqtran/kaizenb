import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppUser, UserRole } from "../types/user";
import {
  changeUserRole,
  getProfile,
  getUsers,
  signOutUser,
  startGoogleSignIn,
  updateUserProfile,
} from "../services/users";
import { getSupabaseClient, isSupabaseConfigured } from "../services/supabase";
import { AuthContext } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");

  const applySession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setUsers([]);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const profile = await getProfile(session.user);
      setUser(profile);
      setError("");
      if (profile.role === "admin") {
        try {
          setUsers(await getUsers());
        } catch (cause) {
          setUsers([]);
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load people.",
          );
        }
      } else {
        setUsers([]);
      }
    } catch (cause) {
      setUser(null);
      setUsers([]);
      setError(
        cause instanceof Error ? cause.message : "Unable to load your account.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const client = getSupabaseClient();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => void applySession(session));
    });
    return () => subscription.unsubscribe();
  }, [applySession]);

  const signIn = useCallback(async () => {
    setError("");
    await startGoogleSignIn();
  }, []);

  const signOut = useCallback(async () => {
    setError("");
    try {
      await signOutUser();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to sign out.";
      setError(message);
    }
  }, []);

  const setUserRole = useCallback(async (targetId: string, role: UserRole) => {
    const updatedUsers = await changeUserRole(targetId, role);
    setUsers(updatedUsers);
  }, []);

  const updateProfile = useCallback(
    async (nickname: string, profileImageKey: string | null) => {
      const updatedUser = await updateUserProfile(nickname, profileImageKey);
      setUser(updatedUser);
      setUsers((current) =>
        current.map((entry) =>
          entry.id === updatedUser.id ? updatedUser : entry,
        ),
      );
      return updatedUser;
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        loading,
        error,
        signIn,
        signOut,
        setUserRole,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
