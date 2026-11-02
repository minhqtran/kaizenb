import { ArrowLeft, PenLine } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ArticleBody } from '../components/BlogImageView'
import { UserAvatar } from '../components/UserAvatar'
import { canEditPost } from '../services/permissions'
import { getPost } from '../services/posts'
import type { BlogPost } from '../types/post'
import { formatDate } from '../utils/formatDate'

export function PostPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const [result, setResult] = useState<{ slug: string; post?: BlogPost; error?: string }>({ slug: '' })

  useEffect(() => {
    let active = true
    getPost(slug, user)
      .then((post) => { if (active) setResult({ slug, post }) })
      .catch((cause: unknown) => {
        if (active) setResult({ slug, error: cause instanceof Error ? cause.message : 'Unable to load this story.' })
      })
    return () => { active = false }
  }, [slug, user])

  const post = result.slug === slug ? result.post : null
  const error = result.slug === slug ? result.error : ''

  if (error) return <div className="article-page error-state" role="alert">{error}<p><Link className="text-link" to="/">Back to stories</Link></p></div>
  if (!post) return <div className="article-page loading-state">Loading story...</div>

  return (
    <article className="article-page">
      <Link className="back-link" to="/"><ArrowLeft size={14} /> All stories</Link>
      <header className="article-header">
        <div className="eyebrow">{post.category}{post.status === 'draft' ? ' · Draft preview' : ''}</div><h1>{post.title}</h1><p className="article-excerpt">{post.excerpt}</p>
        <div className="article-byline">{(post.authorAvatarUrl || post.authorAvatarStorageKey) && <UserAvatar className="author-avatar" displayName={post.authorName} imageKey={post.authorAvatarStorageKey} imageUrl={post.authorAvatarUrl} />}<span><strong>{post.authorName}</strong><br />{formatDate(post.publishedAt ?? post.createdAt)} · {readingTime(post.body)} min read</span></div>
      </header>
      {canEditPost(user, post.authorId) && <div className="article-actions"><Link className="button secondary" to={`/write/${post.slug}`}><PenLine size={14} /> Edit story</Link></div>}
      <ArticleBody body={post.body} images={post.images} contentBlocks={post.contentBlocks} />
    </article>
  )
}

function readingTime(body: string) {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200))
}