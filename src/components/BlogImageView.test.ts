import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ArticleBody } from './BlogImageView'
import { safeMarkdownImageUrl, safeMarkdownUrl } from '../utils/markdown'

describe('Markdown story rendering', () => {
  it('renders common formatting and disables raw HTML', () => {
    const markdown = '# Heading\n\n**bold** and *italic* with `code`.\n\n[Safe link](https://example.test/story)\n\n![Safe image](https://example.test/image.jpg)\n\n- first\n- second\n\n> quoted\n\n```ts\nconst answer = 42\n```\n\n<script>alert(1)</script>'
    const markup = renderToStaticMarkup(createElement(ArticleBody, {
      body: markdown,
      images: [],
      contentBlocks: [{ id: 'text', type: 'markdown', content: markdown }],
    }))
    expect(markup).toContain('<h1>Heading</h1>')
    expect(markup).toContain('<strong>bold</strong>')
    expect(markup).toContain('<em>italic</em>')
    expect(markup).toContain('href="https://example.test/story"')
    expect(markup).toContain('<img src="https://example.test/image.jpg" alt="Safe image"')
    expect(markup).toContain('<ul>')
    expect(markup).toContain('<blockquote>')
    expect(markup).toContain('<pre><code')
    expect(markup).not.toMatch(/<script[\s>]/i)
  })

  it('rejects unsafe link and image protocols', () => {
    expect(safeMarkdownUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeMarkdownUrl('https://example.test/story')).toBe('https://example.test/story')
    expect(safeMarkdownImageUrl('data:image/svg+xml,<svg/>')).toBeUndefined()
    expect(safeMarkdownImageUrl('https://example.test/image.jpg')).toBe('https://example.test/image.jpg')
    const markup = renderToStaticMarkup(createElement(ArticleBody, {
      body: '![bad](javascript:alert(1))\n\n[bad](javascript:alert(1))',
      images: [],
      contentBlocks: [{ id: 'unsafe', type: 'markdown', content: '![bad](javascript:alert(1))\n\n[bad](javascript:alert(1))' }],
    }))
    expect(markup).not.toMatch(/<img[^>]*javascript:/i)
    expect(markup).not.toMatch(/href="javascript:/i)
  })
})