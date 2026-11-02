import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { UserAvatar } from '../components/UserAvatar'
import { effectiveDisplayName, type UserRole } from '../types/user'

export function AdminUsersPage() {
  const { user, users, setUserRole } = useAuth()
  const [message, setMessage] = useState('')
  const orderedUsers = [...users].sort((a, b) => effectiveDisplayName(a).localeCompare(effectiveDisplayName(b)))

  function changeRole(targetId: string, role: UserRole) {
    const target = users.find((entry) => entry.id === targetId)
    if (!target) return
    const action = role === 'writer' ? 'promote this viewer to Writer' : 'revoke this writer’s access'
    if (role === 'viewer' && !window.confirm(`Are you sure you want to ${action}?`)) return
    try {
      setUserRole(targetId, role)
      setMessage(`${effectiveDisplayName(target)} is now a ${role}.`)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to update this role.')
    }
  }

  return (
    <section className="admin-page page-container">
      <div className="admin-heading"><div className="eyebrow">Supreme Leader · {user ? effectiveDisplayName(user) : ''}</div><h1>People & permissions</h1><p>Role changes are stored in this browser for development only.</p></div>
      {message && <p className="success-message" role="status">{message}</p>}
      <div className="user-table-wrap">
        <table className="user-table">
          <thead><tr><th scope="col">Person</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Access</th></tr></thead>
          <tbody>{orderedUsers.map((entry) => (
            <tr key={entry.id}>
              <td><div className="user-cell"><UserAvatar className="user-avatar" displayName={effectiveDisplayName(entry)} imageKey={entry.profileImageKey} imageUrl={entry.avatarUrl} /><strong>{effectiveDisplayName(entry)}{entry.id === user?.id ? ' (you)' : ''}</strong></div></td>
              <td>{entry.email || 'No email provided'}</td>
              <td><span className={`role-label role-${entry.role}`}>{entry.role === 'admin' ? 'Supreme Leader' : entry.role}</span></td>
              <td>{entry.role === 'admin' ? <span className="form-hint">Protected account</span> : entry.role === 'viewer' ? <button className="button secondary table-action" type="button" onClick={() => changeRole(entry.id, 'writer')}>Promote to Writer</button> : <button className="button secondary table-action" type="button" onClick={() => changeRole(entry.id, 'viewer')}>Revoke Writer</button>}</td>
            </tr>
          ))}</tbody>
        </table>
        {orderedUsers.length === 0 && <div className="empty-state">No user profiles yet.</div>}
      </div>
      <p className="security-note">Browser roles are editable by the browser owner and are not an authorization boundary. Enforce all permissions on a backend before launch.</p>
    </section>
  )
}