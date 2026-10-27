import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { useAuth } from '../auth/useAuth'

export function SignInPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')
  const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/'

  if (user) return <Navigate to={destination} replace />

  return (
    <section className="signin-page">
      <Link className="back-link" to="/"><ArrowLeft size={14} /> Back to stories</Link>
      <div className="signin-panel">
        <div className="eyebrow">Goodword account</div>
        <h1>Come on in.</h1>
        <p>Sign in with Google to save your place, write stories, and join the conversation.</p>
        <GoogleSignInButton onSignedIn={() => navigate(destination, { replace: true })} />
        <p className="signin-note">This development prototype reads identity claims in your browser. It does not verify tokens or provide production-grade security.</p>
      </div>
    </section>
  )
}