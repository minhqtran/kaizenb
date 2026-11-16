import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AppUser, UserRole } from "../types/user";
import {
  changeUserRole,
  getSessionUser,
  getUsers,
  updateUserProfile,
} from "../services/users";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "../services/supabaseClient";
import { AuthContext } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(() => isSupabaseConfigured());
  const [error, setError] = useState("");

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
        setError("");
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
          setError("");
        }
      } catch (cause) {
        if (active && currentRequestId === requestId) {
          setUser(null);
          setUsers([]);
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to restore your Supabase session.",
          );
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
    setError("");
    const { error: signInError } = await getSupabaseClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (signInError) {
      setError(signInError.message);
      throw signInError;
    }
  }

  async function signOut() {
    const { error: signOutError } = await getSupabaseClient().auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      throw signOutError;
    }
    setUser(null);
    setUsers([]);
    setError("");
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
      value={{ user, users, loading, error, signIn, signOut, setUserRole, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}