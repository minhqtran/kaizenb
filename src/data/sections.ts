export interface StorySection {
  title: string
  eyebrow: string
  description: string
  category?: string
  paragraphs?: string[]
}

export const categorySections: Record<string, StorySection> = {
  music: {
    title: 'Music',
    eyebrow: 'Listening notes',
    description: 'Records, performances, and the sounds that stay with us.',
    category: 'Music',
  },
  thoughts: {
    title: 'Thoughts',
    eyebrow: 'Field notes',
    description: 'Ideas and observations gathered along the way.',
    category: 'Thoughts',
  },
  film: {
    title: 'Film',
    eyebrow: 'On screen',
    description: 'Films, scenes, and stories worth returning to.',
    category: 'Film',
  },
}

export const aboutSection: StorySection = {
  title: 'About',
  eyebrow: 'A journal for curious people',
  description: 'Goodword is a home for small stories, thoughtful notes, and the details worth keeping.',
  paragraphs: [
    'We believe attention is a creative practice. This journal gathers writing about the places we go, the things we make, and the everyday details that shape a life.',
    'Goodword is made for curious readers and generous storytellers. Take your time, find a thread, and make yourself at home.',
  ],
}