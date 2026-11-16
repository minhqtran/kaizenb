<<<<<<< HEAD
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
=======
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AppUser, UserRole } from "../types/user";
import { changeUserRole, getSessionUser, getUsers, updateUserProfile } from "../services/users";
import { getSupabaseClient, isSupabaseConfigured } from "../services/supabaseClient";
>>>>>>> e37e27e (let's see)
import { AuthContext } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
<<<<<<< HEAD
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
=======
  const [loading, setLoading] = useState(() => isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let active = true;
    let requestId = 0;
    const client = getSupabaseClient();

    async function syncSession(hasSession: boolean) {
      const currentRequestId = ++requestId;
      if (!hasSession) {
        setUser(null);
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextUser = await getSessionUser();
        const nextUsers = nextUser.role === "admin" ? await getUsers() : [];
        if (active && currentRequestId === requestId) {
          setUser(nextUser);
          setUsers(nextUsers);
        }
      } catch {
        if (active && currentRequestId === requestId) {
          setUser(null);
          setUsers([]);
        }
      } finally {
        if (active && currentRequestId === requestId) setLoading(false);
      }
    }

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => void syncSession(Boolean(session)));
    });
    void client.auth.getSession().then(({ data: sessionData }) => {
      void syncSession(Boolean(sessionData.session));
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signIn() {
    const redirectTo = new URL(window.location.href);
    redirectTo.pathname = "/signin";
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
    setUser(null);
    setUsers([]);
  }

  async function setUserRole(targetId: string, role: UserRole) {
    if (!user) throw new Error("Sign in before managing users.");
    setUsers(await changeUserRole(targetId, role));
  }

  async function updateProfile(nickname: string, profileImageKey: string | null) {
    if (!user) throw new Error("Sign in before updating your profile.");
    const updatedUser = await updateUserProfile(nickname, profileImageKey);
    setUser(updatedUser);
    if (updatedUser.role === "admin") setUsers(await getUsers());
    return updatedUser;
  }

  return (
    <AuthContext.Provider
      value={{ user, users, loading, signIn, signOut, setUserRole, updateProfile }}
>>>>>>> e37e27e (let's see)
    >
      {children}
    </AuthContext.Provider>
  );
}
