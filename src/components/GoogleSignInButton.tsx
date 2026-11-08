import { useState } from "react";
import { useAuth } from "../auth/useAuth";
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
  }

  return (
    <div className="google-signin">
      <button
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
    </div>
  );
}
