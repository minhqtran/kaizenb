import { ArrowDown, ArrowLeft, ArrowUp, Eye, ImagePlus, Send, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ArticleBody, ArticleImages, BlogImageView } from '../components/BlogImageView'
import { removeImages, saveImage } from '../services/imageStorage'
import { createPost, getPost, updatePost } from '../services/posts'
import type { BlogImage, BlogImageLayout, BlogPost, BlogStatus, PostInput } from '../types/post'

const emptyPost: PostInput = {
  title: '', slug: '', excerpt: '', body: '', images: [], category: 'Life & culture', status: 'draft',
}
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const maximumImageSize = 8 * 1024 * 1024
const layoutOptions: Array<{ value: BlogImageLayout; label: string }> = [
  { value: 'featured', label: 'Featured image' },
  { value: 'full-width', label: 'Full-width image' },
  { value: 'inline', label: 'Inline image' },
  { value: 'side-by-side', label: 'Side-by-side gallery' },
  { value: 'framed', label: 'Framed image' },
]

export function PostEditorPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState<PostInput>(emptyPost)
  const [loading, setLoading] = useState(Boolean(slug))
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const [removedImages, setRemovedImages] = useState<string[]>([])
  const [manualSlug, setManualSlug] = useState(Boolean(slug))

  useEffect(() => {
    if (!slug || !user) return
    getPost(slug, user)
      .then((post) => {
        setForm(toInput(post))
        setManualSlug(true)
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load this story.'))
      .finally(() => setLoading(false))
  }, [slug, user])

  async function save(status: BlogStatus) {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      const input = { ...form, slug: form.slug || form.title, status }
      const post = slug ? await updatePost(slug, input, user) : await createPost(input, user)
      await removeImages(removedImages)
      navigate(`/posts/${post.slug}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this story.')
      setSaving(false)
    }
  }

  async function handleImageSelection(event: FormEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    const invalid = files.find((file) => !allowedTypes.includes(file.type) || file.size > maximumImageSize)
    if (invalid) {
      setError(!allowedTypes.includes(invalid.type)
        ? `${invalid.name} is not a supported image. Use JPEG, PNG, WebP, or GIF.`
        : `${invalid.name} is larger than 8 MB. Choose a smaller image.`)
      return
    }
    setError('')
    try {
      const alreadyHasFeatured = form.images.some((image) => image.layout === 'featured')
      const added = await Promise.all(files.map(async (file, index): Promise<BlogImage> => ({
        id: crypto.randomUUID(),
        src: '',
        storageKey: await saveImage(file),
        alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        layout: !alreadyHasFeatured && index === 0 ? 'featured' : 'full-width',
      })))
      setForm((current) => ({ ...current, images: [...current.images, ...added] }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to store these images.')
    }
  }

  function updateField(field: 'title' | 'slug' | 'excerpt' | 'body' | 'category', value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'title' && !manualSlug ? { slug: slugify(value) } : {}),
    }))
  }

  function updateImage(index: number, patch: Partial<BlogImage>) {
    setForm((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) => ({
        ...image,
        ...(patch.layout === 'featured' && imageIndex !== index && image.layout === 'featured' ? { layout: 'full-width' as const } : {}),
        ...(imageIndex === index ? patch : {}),
      })),
    }))
  }

  function moveImage(index: number, direction: -1 | 1) {
    setForm((current) => {
      const target = index + direction
      if (target < 0 || target >= current.images.length) return current
      const images = [...current.images]
      ;[images[index], images[target]] = [images[target], images[index]]
      return { ...current, images }
    })
  }

  function removeImage(index: number) {
    const image = form.images[index]
    if (!image || !window.confirm(`Remove this image${image.alt ? ` (${image.alt})` : ''} from the story?`)) return
    setForm((current) => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index) }))
    if (image.storageKey) setRemovedImages((current) => [...current, image.storageKey!])
  }

  if (loading) return <div className="editor-page loading-state">Loading editor...</div>

  if (preview) return (
    <PostPreview
      form={form}
      authorName={user?.displayName ?? 'Writer'}
      authorAvatarUrl={user?.avatarUrl}
      onBack={() => setPreview(false)}
      onSaveDraft={() => save('draft')}
      onPublish={() => save('published')}
      saving={saving}
    />
  )

  return (
    <section className="editor-page">
      <Link className="back-link" to={slug ? `/posts/${slug}` : '/'}><ArrowLeft size={14} /> Cancel and go back</Link>
      <div className="editor-heading"><div className="eyebrow">Your writing desk · {form.status}</div><h1>{slug ? 'Edit your story' : 'Start a story'}</h1></div>
      <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void save('published') }}>
        <div className="form-field"><label htmlFor="title">Title</label><input id="title" required maxLength={180} value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Give your story a title" /></div>
        <div className="form-field"><label htmlFor="slug">Article URL slug</label><input id="slug" required value={form.slug} onChange={(event) => { setManualSlug(true); updateField('slug', slugify(event.target.value)) }} placeholder="story-url" /><span className="form-hint">Generated from the title; edit it if you need a custom URL.</span></div>
        <div className="form-field"><label htmlFor="excerpt">Short introduction</label><textarea id="excerpt" required maxLength={280} rows={3} value={form.excerpt} onChange={(event) => updateField('excerpt', event.target.value)} placeholder="What is this story about?" /><span className="form-hint">A sentence or two shown on the story list.</span></div>
        <div className="form-field"><label htmlFor="body">Story</label><textarea id="body" required minLength={20} value={form.body} onChange={(event) => updateField('body', event.target.value)} placeholder="Write something worth noticing..." /></div>
        <div className="form-field"><label htmlFor="category">Category</label><select id="category" value={form.category} onChange={(event) => updateField('category', event.target.value)}><option>Life & culture</option><option>Travel notes</option><option>At the table</option><option>Creative practice</option></select></div>
        <section className="image-manager" aria-labelledby="image-manager-title">
          <div className="image-manager-heading"><div><label id="image-manager-title">Story images</label><p className="form-hint">JPEG, PNG, WebP, or GIF · up to 8 MB each</p></div><label className="button secondary image-add-button"><ImagePlus size={15} /> Add images<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => void handleImageSelection(event)} /></label></div>
          {form.images.length === 0 ? <div className="image-empty-state">No images yet. Add a featured image or build a gallery.</div> : (
            <div className="image-editor-list">{form.images.map((image, index) => (
              <article className="image-editor-row" key={image.id}>
                <BlogImageView image={image} />
                <div className="image-editor-fields">
                  <div className="form-field"><label htmlFor={`alt-${image.id}`}>Alternative text</label><input id={`alt-${image.id}`} required value={image.alt} onChange={(event) => updateImage(index, { alt: event.target.value })} placeholder="Describe the image" /></div>
                  <div className="form-field"><label htmlFor={`caption-${image.id}`}>Caption (optional)</label><input id={`caption-${image.id}`} value={image.caption ?? ''} onChange={(event) => updateImage(index, { caption: event.target.value })} placeholder="Add a caption" /></div>
                  <div className="form-field"><label htmlFor={`layout-${image.id}`}>Image layout</label><select id={`layout-${image.id}`} value={image.layout} onChange={(event) => updateImage(index, { layout: event.target.value as BlogImageLayout })}>{layoutOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>
                  <div className="image-row-actions">
                    <button className="icon-button" type="button" title="Move image up" aria-label={`Move image ${index + 1} up`} disabled={index === 0} onClick={() => moveImage(index, -1)}><ArrowUp size={15} /></button>
                    <button className="icon-button" type="button" title="Move image down" aria-label={`Move image ${index + 1} down`} disabled={index === form.images.length - 1} onClick={() => moveImage(index, 1)}><ArrowDown size={15} /></button>
                    <button className="icon-button remove-image-button" type="button" title="Remove image" aria-label={`Remove image ${index + 1}`} onClick={() => removeImage(index)}><Trash2 size={15} /></button>
                  </div>
                </div>
              </article>
            ))}</div>
          )}
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions editor-actions"><button className="button secondary" type="button" disabled={saving} onClick={() => setPreview(true)}><Eye size={14} /> Preview</button><button className="button secondary" type="button" disabled={saving} onClick={() => void save('draft')}>Save draft</button><button className="button" type="submit" disabled={saving}><Send size={14} /> {saving ? 'Saving...' : 'Publish story'}</button><Link className="text-link" to={slug ? `/posts/${slug}` : '/my-stories'}>Cancel</Link></div>
      </form>
    </section>
  )
}

function PostPreview({ form, authorName, authorAvatarUrl, onBack, onSaveDraft, onPublish, saving }: {
  form: PostInput
  authorName: string
  authorAvatarUrl?: string
  onBack: () => void
  onSaveDraft: () => void
  onPublish: () => void
  saving: boolean
}) {
  const cover = form.images.find((image) => image.layout === 'featured')
  return (
    <div className="article-page preview-page">
      <button className="back-link preview-back" type="button" onClick={onBack}><ArrowLeft size={14} /> Back to editor</button>
      <div className="article-actions preview-actions"><button className="button secondary" type="button" onClick={onSaveDraft} disabled={saving}>Save draft</button><button className="button" type="button" onClick={onPublish} disabled={saving}><Send size={14} /> {saving ? 'Saving...' : 'Publish story'}</button></div>
      <header className="article-header"><div className="eyebrow">{form.category} · Preview</div><h1>{form.title || 'Untitled story'}</h1><p className="article-excerpt">{form.excerpt || 'Your introduction will appear here.'}</p><div className="article-byline">{authorAvatarUrl && <img className="author-avatar" src={authorAvatarUrl} alt="" />}<span><strong>{authorName}</strong><br />Preview · {readingTime(form.body)} min read</span></div></header>
      {cover && <div className="article-cover"><BlogImageView image={cover} /></div>}
      <ArticleBody body={form.body || 'Your story will appear here.'} images={form.images} />
      <ArticleImages images={form.images} />
    </div>
  )
}

function toInput(post: BlogPost): PostInput {
  return { title: post.title, slug: post.slug, excerpt: post.excerpt, body: post.body, images: post.images, category: post.category, status: post.status }
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function readingTime(body: string) {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200))
}