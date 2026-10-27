import { ArrowUpRight, LogOut, PenLine, Shield } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { canWrite } from '../services/permissions'

export function SiteLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="wordmark" to="/">good<span>word</span>.</Link>
        <div className="header-actions">
          <nav className="nav-links" aria-label="Main navigation">
            <Link to="/">Stories</Link>
            <a href="mailto:hello@goodword.example">About <ArrowUpRight size={13} /></a>
            {user && canWrite(user) && <Link to="/my-stories">My stories</Link>}
            {user?.role === 'admin' && <Link to="/admin/posts">Manage posts</Link>}
          </nav>
          {user && canWrite(user) && <Link className="button" to="/write"><PenLine size={14} /> Write a story</Link>}
          {user?.role === 'admin' && <Link className="icon-button admin-nav" to="/admin/users" aria-label="Admin user management" title="Admin user management"><Shield size={16} /></Link>}
          {user ? (
            <div className="account-menu">
              {user.avatarUrl ? <img className="account-avatar" src={user.avatarUrl} alt="" /> : <span className="account-avatar avatar-fallback">{user.displayName.slice(0, 1).toUpperCase()}</span>}
              <span className="account-label"><strong>{user.displayName}</strong><small>{user.role === 'admin' ? 'Supreme Leader' : user.role}</small></span>
              <button className="icon-button signout-button" type="button" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={15} /></button>
            </div>
          ) : <Link className="button sign-in-link" to="/signin">Sign in</Link>}
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <div className="page-container footer-inner">
          <span className="wordmark">good<span>word</span>.</span>
          <span>Small stories, thoughtfully told.</span>
          <span>© {new Date().getFullYear()} Goodword</span>
        </div>
      </footer>
    </div>
  )
}