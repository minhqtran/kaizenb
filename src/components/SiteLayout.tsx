import { ChevronDown, LogOut, PenLine, Shield } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { UserAvatar } from './UserAvatar'
import { canWrite } from '../services/permissions'
import { effectiveDisplayName } from '../types/user'

export function SiteLayout() {
  const { user, signOut } = useAuth()
  const accountName = user ? effectiveDisplayName(user) : ''
  const location = useLocation()
  const [categoriesOpenAt, setCategoriesOpenAt] = useState<string | null>(null)
  const categoriesActive = location.pathname.startsWith('/categories/')
  const categoriesOpen = categoriesOpenAt === location.pathname

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="wordmark" to="/">good<span>word</span>.</Link>
        <div className="header-actions">
          <nav className="nav-links" aria-label="Main navigation">
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Home</NavLink>
            <NavLink to="/about" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>About</NavLink>
            <div className={`nav-dropdown${categoriesActive ? ' active' : ''}`}>
              <button className={`nav-link dropdown-trigger${categoriesActive ? ' active' : ''}`} type="button" aria-haspopup="true" aria-expanded={categoriesOpen || categoriesActive} onClick={() => setCategoriesOpenAt((openAt) => openAt === location.pathname ? null : location.pathname)}>
                Categories <ChevronDown size={13} />
              </button>
              {(categoriesOpen || categoriesActive) && <div className="category-menu" role="menu">
                {['Music', 'Thoughts', 'Film'].map((category) => <NavLink key={category} role="menuitem" to={`/categories/${category.toLowerCase()}`} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>{category}</NavLink>)}
              </div>}
            </div>
            {user && canWrite(user) && <NavLink to="/my-stories" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>My Stories</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin/posts" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Manage posts</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin/users" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Shield size={13} /> Permission</NavLink>}
            <NavLink to={user ? '/account' : '/signin'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Account</NavLink>
          </nav>
          {user && canWrite(user) && <Link className="button" to="/write"><PenLine size={14} /> Write a story</Link>}
          {user ? (
            <div className="account-menu">
              <Link className="account-profile-link" to="/account" aria-label="Open account profile">
                <UserAvatar className="account-avatar" displayName={accountName} imageKey={user.profileImageKey} imageUrl={user.avatarUrl} />
                <span className="account-label"><strong>{accountName}</strong><small>{user.role === 'admin' ? 'Supreme Leader' : user.role}</small></span>
              </Link>
              <button className="icon-button signout-button" type="button" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={15} /></button>
            </div>
          ) : <Link className="button sign-in-link" to="/signin">Sign in</Link>}
        </div>
      </header>
      <main key={location.pathname} className="page-enter"><Outlet /></main>
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