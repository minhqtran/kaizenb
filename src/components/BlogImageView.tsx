import { Fragment } from 'react'
import { useEffect, useState } from 'react'
import type { BlogImage } from '../types/post'
import { getImage } from '../services/imageStorage'

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

export function ArticleBody({ body, images }: { body: string; images: BlogImage[] }) {
  const paragraphs = body.split(/\n\s*\n/).filter(Boolean)
  const inlineImages = images.filter((image) => image.layout === 'inline')
  let nextImage = 0

  return (
    <div className="article-body">
      {paragraphs.map((paragraph, index) => {
        const image = inlineImages[nextImage++]
        return <Fragment key={`${index}-${paragraph.slice(0, 20)}`}><p>{paragraph}</p>{image && <BlogImageView image={image} key={image.id} />}</Fragment>
      })}
      {inlineImages.slice(nextImage).map((image) => <BlogImageView image={image} key={image.id} />)}
    </div>
  )
}