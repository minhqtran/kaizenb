import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppUser } from '../types/user'
import { createPost, deletePost, getAllPosts, getMyPosts, getPost, getPosts, updatePost } from './posts'

const writer: AppUser = { id: 'writer-1', googleSubject: 'sub-1', email: 'writer@example.test', displayName: 'Writer One', role: 'writer' }
const otherWriter: AppUser = { id: 'writer-2', googleSubject: 'sub-2', email: 'writer2@example.test', displayName: 'Writer Two', role: 'writer' }
const admin: AppUser = { id: 'admin-1', googleSubject: 'sub-admin', email: 'admin@example.test', displayName: 'Admin', role: 'admin' }
const input = {
  title: 'A new story', slug: 'a-new-story', excerpt: 'A short summary', body: 'A little more than twenty characters in this draft.',
  images: [], category: 'Life & culture', status: 'draft' as const,
}

function installStorage() {
  const values = new Map<string, string>([['goodword.posts.v1', '[]']])
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
}

describe('local post repository', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    installStorage()
  })

  it('creates drafts with the signed-in writer as the canonical author', async () => {
    const post = await createPost(input, writer)
    expect(post.authorId).toBe(writer.id)
    expect(post.authorName).toBe(writer.displayName)
    expect(post.status).toBe('draft')
    expect(post.publishedAt).toBeUndefined()
    expect(await getPosts()).toHaveLength(0)
    expect((await getMyPosts(writer))[0].id).toBe(post.id)
  })

  it('hides drafts from viewers and other writers', async () => {
    const post = await createPost(input, writer)
    await expect(getPost(post.slug)).rejects.toThrow('could not be found')
    await expect(getPost(post.slug, otherWriter)).rejects.toThrow('could not be found')
    await expect(updatePost(post.slug, { ...input, title: 'Changed' }, otherWriter)).rejects.toThrow('cannot edit')
    await expect(getMyPosts(otherWriter)).resolves.toEqual([])
  })

  it('preserves original author attribution when an admin edits another writer post', async () => {
    const post = await createPost(input, writer)
    const updated = await updatePost(post.slug, { ...input, title: 'Admin edit', status: 'published' }, admin)
    expect(updated.authorId).toBe(writer.id)
    expect(updated.authorName).toBe(writer.displayName)
    expect(updated.publishedAt).toBeTruthy()
    await expect(getPost(updated.slug)).resolves.toMatchObject({ title: 'Admin edit', authorId: writer.id })
  })

  it('limits cross-author post discovery and deletion to admins', async () => {
    const post = await createPost(input, writer)
    await expect(getAllPosts(writer)).rejects.toThrow('Only admins')
    await expect(deletePost(post.slug, writer)).rejects.toThrow('Only admins')
    await expect(getAllPosts(admin)).resolves.toHaveLength(1)
    await deletePost(post.slug, admin)
    await expect(getAllPosts(admin)).resolves.toHaveLength(0)
  })

  it('rejects publishing incomplete stories and images without alt text', async () => {
    await expect(createPost({ ...input, status: 'published', title: '' }, writer)).rejects.toThrow('requires a title')
    await expect(createPost({
      ...input,
      status: 'published',
      images: [{ id: 'image-1', src: '', alt: ' ', layout: 'featured' }],
    }, writer)).rejects.toThrow('alternative text')
  })
})