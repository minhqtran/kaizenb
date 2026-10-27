interface GoogleCredentialResponse {
  credential?: string
  select_by?: string
}

interface GoogleIdentityConfiguration {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  cancel_on_tap_outside?: boolean
  use_fedcm_for_button?: boolean
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  width?: number
  logo_alignment?: 'left' | 'center'
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (configuration: GoogleIdentityConfiguration) => void
        renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void
        disableAutoSelect: () => void
      }
    }
  }
}