import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getMyPosts } from '../services/posts'
import type { BlogPost } from '../types/post'
import { formatDate } from '../utils/formatDate'

export function MyStoriesPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    getMyPosts(user).then(setPosts).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load your stories.'))
  }, [user])

  return (
    <section className="page-container stories-manager">
      <div className="manager-heading"><div><div className="eyebrow">Your writing desk</div><h1>My stories</h1></div><Link className="button" to="/write"><Plus size={15} /> New story</Link></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {posts.length ? <div className="story-management-list">{posts.map((post) => (
        <article className="managed-story" key={post.id}>
          <div><span className={`status-pill status-${post.status}`}>{post.status}</span><h2>{post.title || 'Untitled story'}</h2><p>{post.excerpt}</p><small>Updated {formatDate(post.updatedAt)}{post.authorId !== user?.id ? ` · by ${post.authorName}` : ''}</small></div>
          <div className="managed-story-actions"><Link className="button secondary" to={`/write/${post.slug}`}>Edit</Link>{post.status === 'published' && <Link className="text-link" to={`/posts/${post.slug}`}>Read</Link>}</div>
        </article>
      ))}</div> : !error && <div className="empty-state">You have not started a story yet. Your drafts and published work will live here.</div>}
    </section>
  )
}