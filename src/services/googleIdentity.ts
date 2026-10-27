import type { GoogleIdentity } from '../types/user'

const scriptUrl = 'https://accounts.google.com/gsi/client'

function loadScript(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`)
    const script = existing ?? document.createElement('script')
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Google sign-in could not be loaded. Check your connection and try again.')), { once: true })
    if (!existing) {
      script.src = scriptUrl
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  })
}

function decodePayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1]
  if (!payload) throw new Error('Google returned an invalid identity response. Please try again.')
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
}

export function identityFromCredential(token: string): GoogleIdentity {
  const claims = decodePayload(token)
  const googleSubject = typeof claims.sub === 'string' ? claims.sub : ''
  const email = typeof claims.email === 'string' ? claims.email : ''
  const displayName = typeof claims.name === 'string' ? claims.name : email.split('@')[0] || 'Google user'
  if (!googleSubject) throw new Error('Google did not provide a stable account identifier. Please try again.')

  return {
    googleSubject,
    email,
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    displayName,
    ...(typeof claims.picture === 'string' ? { avatarUrl: claims.picture } : {}),
  }
}

export async function initializeGoogleButton(
  target: HTMLElement,
  clientId: string,
  onCredential: (identity: GoogleIdentity) => void,
  onError: (message: string) => void,
): Promise<void> {
  await loadScript()
  if (!window.google?.accounts.id) throw new Error('Google sign-in is unavailable in this browser.')

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      try {
        if (!response.credential) throw new Error('Sign-in was not completed. You can try again.')
        onCredential(identityFromCredential(response.credential))
      } catch (cause) {
        onError(cause instanceof Error ? cause.message : 'Google sign-in failed. Please try again.')
      }
    },
    cancel_on_tap_outside: true,
    use_fedcm_for_button: true,
  })
  target.replaceChildren()
  window.google.accounts.id.renderButton(target, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    width: 280,
    logo_alignment: 'left',
  })
}

export function disableGoogleAutoSelect() {
  window.google?.accounts.id.disableAutoSelect()
}