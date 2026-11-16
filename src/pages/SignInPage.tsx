import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { useAuth } from '../auth/useAuth'

export function SignInPage() {
  const { user, loading, error } = useAuth()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')
  const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/'

  if (loading) return <section className="signin-page"><div className="signin-panel">Checking your session...</div></section>
  if (user) return <Navigate to={destination} replace />

  return (
    <section className="signin-page">
      <Link className="back-link" to="/"><ArrowLeft size={14} /> Back to stories</Link>
      <div className="signin-panel">
        <div className="eyebrow">KaizenB account</div>
        <h1>Come on in.</h1>
        <p>Sign in with Google to save your place, write stories, and join the conversation.</p>
        <GoogleSignInButton />
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="signin-note">Google sign-in is verified by Supabase Auth. Access to drafts and writing tools is controlled by backend permissions.</p>
      </div>
    </section>
  )
}