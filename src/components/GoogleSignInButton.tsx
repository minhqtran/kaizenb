import { useState } from "react";
import { useAuth } from "../auth/useAuth";
<<<<<<< HEAD
import { isSupabaseConfigured } from "../services/supabase";

export function GoogleSignInButton() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isSupabaseConfigured) {
    return (
      <p className="setup-message">
        Sign-in is not configured. Set <code>VITE_SUPABASE_URL</code> and{" "}
        <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code>, then
        restart the app.
      </p>
    );
  }

  async function beginSignIn() {
    setError("");
    setLoading(true);
    try {
      await signIn();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Google sign-in failed.",
      );
      setLoading(false);
    }
=======
import { isSupabaseConfigured } from "../services/supabaseClient";

export function GoogleSignInButton() {
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isSupabaseConfigured()) {
    return <p className="setup-message">Supabase sign-in is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>.</p>
>>>>>>> e37e27e (let's see)
  }

  return (
    <div className="google-signin">
      <button
<<<<<<< HEAD
        className="button"
        type="button"
        onClick={() => void beginSignIn()}
        disabled={loading}
      >
        {loading ? "Connecting to Google..." : "Continue with Google"}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
=======
        className="button secondary"
        type="button"
        disabled={loading}
        onClick={() => {
          setLoading(true)
          setError("")
          void signIn().catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : "Google sign-in failed.")
            setLoading(false)
          })
        }}
      >
        {loading ? "Connecting to Google..." : "Continue with Google"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
>>>>>>> e37e27e (let's see)
    </div>
  );
}
