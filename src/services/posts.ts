import { mockPosts } from '../data/mockPosts'
import type { AppUser } from '../types/user'
import type { BlogPost, PostInput } from '../types/post'
import { createSlug } from '../utils/formatDate'
import { removeImages } from './imageStorage'
import { canAdmin, canEditPost, canWrite } from './permissions'

const postsKey = 'goodword.posts.v1'

function readPosts(): BlogPost[] {
  try {
    const raw = localStorage.getItem(postsKey)
    if (!raw) {
      localStorage.setItem(postsKey, JSON.stringify(mockPosts))
      return [...mockPosts]
    }
    const posts: unknown = JSON.parse(raw)
    return Array.isArray(posts) ? posts as BlogPost[] : [...mockPosts]
  } catch {
    return [...mockPosts]
  }
}

function writePosts(posts: BlogPost[]) {
  localStorage.setItem(postsKey, JSON.stringify(posts))
}

function uniqueSlug(title: string, posts: BlogPost[], currentId?: string) {
  const base = createSlug(title) || `story-${Date.now()}`
  let slug = base
  let suffix = 2
  while (posts.some((post) => post.slug === slug && post.id !== currentId)) slug = `${base}-${suffix++}`
  return slug
}

function validateForPublish(input: PostInput) {
  if (!input.title.trim() || !input.excerpt.trim() || input.body.trim().length < 20) {
    throw new Error('Publishing requires a title, short introduction, and at least 20 characters of story text.')
  }
  if (input.images.some((image) => !image.alt.trim())) {
    throw new Error('Add alternative text to every image before publishing.')
  }
}

export async function getPosts(): Promise<BlogPost[]> {
  return readPosts()
    .filter((post) => post.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
}

export async function getAllPosts(actor: AppUser): Promise<BlogPost[]> {
  if (!canAdmin(actor)) throw new Error('Only admins can manage all posts.')
  return readPosts().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getMyPosts(actor: AppUser): Promise<BlogPost[]> {
  if (!canWrite(actor)) throw new Error('Writer access is required to view your stories.')
  return readPosts()
    .filter((post) => actor.role === 'admin' || post.authorId === actor.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getPost(slug: string, actor?: AppUser | null): Promise<BlogPost> {
  const post = readPosts().find((item) => item.slug === slug)
  if (!post || (post.status === 'draft' && !canEditPost(actor, post.authorId))) {
    throw new Error('This story could not be found.')
  }
  return post
}

export async function createPost(input: PostInput, actor: AppUser): Promise<BlogPost> {
  if (!canWrite(actor)) throw new Error('Writer access is required to create stories.')
  if (input.status === 'published') validateForPublish(input)
  const posts = readPosts()
  const now = new Date().toISOString()
  const post: BlogPost = {
    ...input,
    id: crypto.randomUUID(),
    slug: uniqueSlug(input.slug || input.title, posts),
    authorId: actor.id,
    authorName: actor.displayName,
    ...(actor.avatarUrl ? { authorAvatarUrl: actor.avatarUrl } : {}),
    createdAt: now,
    updatedAt: now,
    ...(input.status === 'published' ? { publishedAt: now } : {}),
  }
  writePosts([post, ...posts])
  return post
}

export async function updatePost(slug: string, input: PostInput, actor: AppUser): Promise<BlogPost> {
  const posts = readPosts()
  const existing = posts.find((post) => post.slug === slug)
  if (!existing || !canEditPost(actor, existing.authorId)) throw new Error('You cannot edit this story.')
  if (input.status === 'published') validateForPublish(input)
  const updated: BlogPost = {
    ...existing,
    ...input,
    id: existing.id,
    slug: uniqueSlug(input.slug || input.title, posts, existing.id),
    authorId: existing.authorId,
    authorName: existing.authorName,
    ...(existing.authorAvatarUrl ? { authorAvatarUrl: existing.authorAvatarUrl } : {}),
    updatedAt: new Date().toISOString(),
    ...(input.status === 'published' ? { publishedAt: existing.publishedAt ?? new Date().toISOString() } : { publishedAt: undefined }),
  }
  writePosts(posts.map((post) => post.id === existing.id ? updated : post))
  return updated
}

export async function deletePost(slug: string, actor: AppUser): Promise<void> {
  if (!canAdmin(actor)) throw new Error('Only admins can remove posts.')
  const posts = readPosts()
  const post = posts.find((entry) => entry.slug === slug)
  if (!post) throw new Error('This story could not be found.')
  await removeImages(post.images.map((image) => image.storageKey).filter((key): key is string => Boolean(key)))
  writePosts(posts.filter((entry) => entry.id !== post.id))
}