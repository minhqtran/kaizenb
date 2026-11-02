import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import type { BlogImage, StoryBlock } from '../types/post'
import { getImage } from '../services/imageStorage'
import { safeMarkdownImageUrl, safeMarkdownUrl } from '../utils/markdown'

export function BlogImageView({ image }: { image: BlogImage }) {
  const [storedSource, setStoredSource] = useState<{ key: string; url: string }>({ key: '', url: '' })

  useEffect(() => {
    if (!image.storageKey) return
    let active = true
    let objectUrl = ''
    getImage(image.storageKey)
      .then((blob) => {
        if (!blob || !active) return
        objectUrl = URL.createObjectURL(blob)
        setStoredSource({ key: image.storageKey!, url: objectUrl })
      })
      .catch(() => undefined)
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [image.storageKey])

  const source = image.storageKey
    ? storedSource.key === image.storageKey ? storedSource.url : ''
    : image.src

  return (
    <figure className={`blog-image image-${image.layout}`}>
      {source ? <img src={source} alt={image.alt} /> : <div className="image-placeholder" aria-label="Image loading" />}
      {image.caption && <figcaption>{image.caption}</figcaption>}
    </figure>
  )
}

export function ArticleImages({ images }: { images: BlogImage[] }) {
  const contentImages = images.filter((image) => image.layout !== 'featured' && image.layout !== 'inline')
  const groups: Array<{ layout: BlogImage['layout']; images: BlogImage[] }> = []

  contentImages.forEach((image) => {
    const lastGroup = groups[groups.length - 1]
    if (image.layout === 'side-by-side' && lastGroup?.layout === 'side-by-side') lastGroup.images.push(image)
    else groups.push({ layout: image.layout, images: [image] })
  })

  return <>{groups.map((group) => group.layout === 'side-by-side' ? (
    <div className="article-image-gallery" key={group.images.map((image) => image.id).join('-')}>
      {group.images.map((image) => <BlogImageView image={image} key={image.id} />)}
    </div>
  ) : group.images.map((image) => <BlogImageView image={image} key={image.id} />))}</>
}

const markdownPlugins = [remarkGfm]
const markdownSanitizers = [rehypeSanitize]

export function ArticleBody({ body, images, contentBlocks }: { body: string; images: BlogImage[]; contentBlocks?: StoryBlock[] }) {
  const imageById = new Map(images.map((image) => [image.id, image]))
  const blocks = contentBlocks ?? [
    ...(body ? [{ id: 'legacy-body', type: 'markdown' as const, content: body }] : []),
    ...images.map((image) => ({ id: `legacy-${image.id}`, type: 'image' as const, imageId: image.id })),
  ]
  const rendered: React.ReactNode[] = []

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    if (block.type === 'markdown') {
      rendered.push(<ReactMarkdown key={block.id} remarkPlugins={markdownPlugins} rehypePlugins={markdownSanitizers} urlTransform={safeMarkdownUrl} components={{
        a: ({ href, children, ...props }) => {
          const safeHref = safeMarkdownUrl(href ?? '')
          return <a href={safeHref} target={safeHref?.startsWith('http') ? '_blank' : undefined} rel={safeHref?.startsWith('http') ? 'noopener noreferrer' : undefined} {...props}>{children}</a>
        },
        img: ({ src, alt }) => {
          const safeSource = safeMarkdownImageUrl(src)
          return safeSource ? <img src={safeSource} alt={alt ?? ''} loading="lazy" /> : null
        },
      }}>{block.content}</ReactMarkdown>)
      continue
    }

    const image = imageById.get(block.imageId)
    if (!image) continue
    if (image.layout === 'side-by-side') {
      const group: BlogImage[] = [image]
      while (index + 1 < blocks.length && blocks[index + 1].type === 'image') {
        const nextImage = imageById.get((blocks[index + 1] as Extract<StoryBlock, { type: 'image' }>).imageId)
        if (!nextImage || nextImage.layout !== 'side-by-side') break
        group.push(nextImage)
        index += 1
      }
      rendered.push(<div className="article-image-gallery" key={group.map((entry) => entry.id).join('-')}>{group.map((entry) => <BlogImageView image={entry} key={entry.id} />)}</div>)
    } else {
      rendered.push(<BlogImageView image={image} key={block.id} />)
    }
  }

  return <div className="article-body">{rendered.length ? rendered : <p>{body}</p>}</div>
}

