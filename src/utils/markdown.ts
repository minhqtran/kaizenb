export function safeMarkdownUrl(value: string) {
  try {
    const url = new URL(value.trim(), 'https://goodword.invalid')
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? value : undefined
  } catch {
    return undefined
  }
}

export function safeMarkdownImageUrl(value: string | undefined) {
  if (!value) return undefined
  try {
    const url = new URL(value.trim(), 'https://goodword.invalid')
    return ['https:', 'http:'].includes(url.protocol) ? value : undefined
  } catch {
    return undefined
  }
}