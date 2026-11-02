import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlogImageView } from '../components/BlogImageView'
import { aboutSection, categorySections, type StorySection } from '../data/sections'
import { getPostsByCategory } from '../services/posts'
import type { BlogPost } from '../types/post'
import { formatDate } from '../utils/formatDate'

export function SectionPage({ section }: { section?: 'about' }) {
  const { category = '' } = useParams()
  const content: StorySection | undefined = section === 'about' ? aboutSection : categorySections[category.toLowerCase()]
  const [result, setResult] = useState<{ category: string; posts?: BlogPost[]; error?: string }>({ category: '' })

  useEffect(() => {
    if (!content?.category) return
    let active = true
    getPostsByCategory(content.category)
      .then((items) => { if (active) setResult({ category: content.category!, posts: items }) })
      .catch((cause: unknown) => { if (active) setResult({ category: content.category!, error: cause instanceof Error ? cause.message : 'Unable to load stories.' }) })
    return () => { active = false }
  }, [content])

  const currentResult = result.category === content?.category
  const posts = currentResult ? result.posts ?? [] : []
  const loading = Boolean(content?.category) && !currentResult
  const error = currentResult ? result.error : ''

  if (!content) return <div className="page-container section-page"><div className="error-state">This section could not be found.<p><Link className="text-link" to="/">Back home <ArrowRight size={14} /></Link></p></div></div>

  return (
    <div className="page-container section-page">
      <header className="section-header"><div className="eyebrow">{content.eyebrow}</div><h1>{content.title}</h1><p>{content.description}</p></header>
      {content.paragraphs && <div className="about-copy">{content.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>}
      {loading && <div className="loading-state">Gathering stories...</div>}
      {error && <div className="error-state" role="alert">{error}</div>}
      {!loading && !error && content.category && (posts.length ? <div className="post-grid">{posts.map((post) => <SectionStoryCard key={post.id} post={post} />)}</div> : <div className="empty-state">No {content.title.toLowerCase()} stories just yet.</div>)}
    </div>
  )
}

function SectionStoryCard({ post }: { post: BlogPost }) {
  return (
    <article className="post-card">
      <Link className="post-card-image" to={`/posts/${post.slug}`} aria-label={post.title}>
        {post.images.find((image) => image.layout === 'featured') && <BlogImageView image={post.images.find((image) => image.layout === 'featured')!} />}
      </Link>
      <div className="section-kicker">{post.category}</div><h3><Link to={`/posts/${post.slug}`}>{post.title}</Link></h3>
      <p>{post.excerpt}</p><div className="card-meta">{post.authorName} · {formatDate(post.publishedAt ?? post.createdAt)}</div>
    </article>
  )
}