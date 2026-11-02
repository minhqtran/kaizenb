import { describe, expect, it } from 'vitest'
import { validateImageFile } from './imageStorage'

describe('profile image validation', () => {
  it('accepts supported image types within the existing 8 MB limit', () => {
    expect(() => validateImageFile(new File(['image'], 'portrait.webp', { type: 'image/webp' }))).not.toThrow()
  })

  it('rejects unsupported types and oversized images', () => {
    expect(() => validateImageFile(new File(['text'], 'portrait.svg', { type: 'image/svg+xml' }))).toThrow('not a supported image')
    const oversizedImage = new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'portrait.png', { type: 'image/png' })
    expect(() => validateImageFile(oversizedImage)).toThrow('larger than 8 MB')
  })
})