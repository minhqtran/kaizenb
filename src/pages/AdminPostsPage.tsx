import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { deletePost, getAllPosts } from '../services/posts'
import type { BlogPost } from '../types/post'
import { formatDate } from '../utils/formatDate'

export function AdminPostsPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    getAllPosts(user).then(setPosts).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load posts.'))
  }, [user])

  async function remove(post: BlogPost) {
    if (!user || !window.confirm(`Permanently remove “${post.title || 'Untitled story'}” from this browser?`)) return
    try {
      await deletePost(post.slug, user)
      setPosts((current) => current.filter((entry) => entry.id !== post.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove this post.')
    }
  }

  return (
    <section className="page-container stories-manager">
      <div className="manager-heading"><div><div className="eyebrow">Supreme Leader</div><h1>All stories</h1></div><Link className="button secondary" to="/admin/users">Manage people</Link></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {posts.length ? <div className="story-management-list">{posts.map((post) => (
        <article className="managed-story" key={post.id}>
          <div><span className={`status-pill status-${post.status}`}>{post.status}</span><h2>{post.title || 'Untitled story'}</h2><p>{post.excerpt}</p><small>{post.authorName} · Updated {formatDate(post.updatedAt)}</small></div>
          <div className="managed-story-actions"><Link className="button secondary" to={`/write/${post.slug}`}>Edit</Link><button className="text-button danger-text" type="button" onClick={() => void remove(post)}>Remove</button></div>
        </article>
      ))}</div> : !error && <div className="empty-state">No posts yet.</div>}
    </section>
  )
}