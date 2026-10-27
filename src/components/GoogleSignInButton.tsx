import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { initializeGoogleButton } from '../services/googleIdentity'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

export function GoogleSignInButton({ onSignedIn }: { onSignedIn: () => void }) {
  const { signIn } = useAuth()
  const buttonTarget = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(Boolean(clientId))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!clientId || !buttonTarget.current) return
    let active = true
    initializeGoogleButton(buttonTarget.current, clientId, (identity) => {
      try {
        signIn(identity)
        onSignedIn()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to save your profile in this browser.')
      }
    }, (message) => setError(message))
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Google sign-in could not be initialized.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [onSignedIn, signIn])

  if (!clientId) {
    return <p className="setup-message">Google sign-in is not configured. Add <code>VITE_GOOGLE_CLIENT_ID</code> to <code>.env.local</code>, then restart the dev server.</p>
  }

  return (
    <div className="google-signin">
      {loading && <span className="form-hint">Loading Google sign-in...</span>}
      <div ref={buttonTarget} aria-label="Sign in with Google" />
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}