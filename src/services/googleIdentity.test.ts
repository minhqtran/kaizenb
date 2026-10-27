import { describe, expect, it } from 'vitest'
import { identityFromCredential } from './googleIdentity'

function makeCredential(claims: Record<string, unknown>) {
  const bytes = new TextEncoder().encode(JSON.stringify(claims))
  const payload = btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${payload}.signature`
}

describe('Google identity claims', () => {
  it('uses the stable subject and available profile claims', () => {
    expect(identityFromCredential(makeCredential({
      sub: 'google-sub-123', email: 'writer@example.test', email_verified: true,
      name: 'Taylor Writer', picture: 'https://example.test/avatar.jpg',
    }))).toEqual({
      googleSubject: 'google-sub-123', email: 'writer@example.test', emailVerified: true,
      displayName: 'Taylor Writer', avatarUrl: 'https://example.test/avatar.jpg',
    })
  })

  it('decodes Unicode profile names', () => {
    expect(identityFromCredential(makeCredential({ sub: 'google-sub', name: 'Zoë 東京' })).displayName).toBe('Zoë 東京')
  })

  it('falls back gracefully when optional profile claims are missing', () => {
    expect(identityFromCredential(makeCredential({ sub: 'google-sub-456' }))).toEqual({
      googleSubject: 'google-sub-456', email: '', emailVerified: false, displayName: 'Google user',
    })
  })

  it('rejects credentials without a stable subject', () => {
    expect(() => identityFromCredential(makeCredential({ email: 'person@example.test' }))).toThrow(/stable account identifier/)
  })
})