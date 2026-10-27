import type { BlogPost } from '../types/post'

const sampleAuthor = {
  authorId: 'legacy:mara-ellison',
  authorName: 'Mara Ellison',
  authorAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&q=80',
}

export const mockPosts: BlogPost[] = [
  {
    id: 'sample-1', slug: 'making-room-for-the-ordinary', title: 'Making room for the ordinary',
    excerpt: 'A small case for paying attention to the quiet rituals that make a life feel like your own.',
    body: `Most days do not announce themselves. They arrive as the kettle coming to a boil, a familiar street in new light, a message from someone you love. It is easy to mistake the ordinary for the empty space between the important things.\n\nBut attention changes the scale of a day. When we give small rituals a little room, they become a way of returning to ourselves. Not a productivity trick or a grand practice. Just a few minutes, noticed.\n\nThis week, try leaving one thing unfinished long enough to enjoy it: the walk without a destination, the coffee before the inbox, the conversation without checking the time. The ordinary has been waiting there all along.`,
    category: 'Life & culture', images: [{ id: 'sample-image-1', src: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1400&q=85', alt: 'A quiet cafe in morning light', layout: 'featured' }],
    ...sampleAuthor, status: 'published', createdAt: '2026-10-18T09:00:00.000Z', updatedAt: '2026-10-18T09:00:00.000Z', publishedAt: '2026-10-18T09:00:00.000Z',
  },
  {
    id: 'sample-2', slug: 'the-colors-of-a-changing-season', title: 'The colors of a changing season',
    excerpt: 'Notes from a long walk through the city as the leaves begin to turn.',
    body: `The first signs of autumn show up in the places you almost miss. A shop window changes its display. The air has a little more edge on the walk home. Then, all at once, the trees along the avenue are keeping their own calendar.\n\nI took the longer route this morning, following the color instead of the map. A row of amber leaves held the light above the sidewalk, and for a moment the whole block felt newly arranged.`,
    category: 'Travel notes', images: [{ id: 'sample-image-2', src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1100&q=85', alt: 'Mountain landscape in autumn light', layout: 'featured' }],
    ...sampleAuthor, status: 'published', createdAt: '2026-10-12T09:00:00.000Z', updatedAt: '2026-10-12T09:00:00.000Z', publishedAt: '2026-10-12T09:00:00.000Z',
  },
  {
    id: 'sample-3', slug: 'a-table-for-more-than-one', title: 'A table for more than one',
    excerpt: 'On cooking generously, setting an extra place, and the recipes that bring us back.',
    body: `A good meal is rarely only about what is on the plate. It is the extra chair pulled in from the next room, the bread torn by hand, the recipe passed along with a note in the margin.\n\nThis is a simple menu for those evenings: something warm in the oven, a bright salad, and enough time to let the conversation wander.`,
    category: 'At the table', images: [{ id: 'sample-image-3', src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1100&q=85', alt: 'A dinner table set for a meal', layout: 'featured' }],
    ...sampleAuthor, status: 'published', createdAt: '2026-10-04T09:00:00.000Z', updatedAt: '2026-10-04T09:00:00.000Z', publishedAt: '2026-10-04T09:00:00.000Z',
  },
  {
    id: 'sample-4', slug: 'learning-to-look-again', title: 'Learning to look again',
    excerpt: 'A photographer shares the practice of seeing familiar places with fresh eyes.',
    body: `Photography gave me a reason to take the same walk twice. The second time, I started to notice how the light moved across the brickwork and where people paused to talk.\n\nYou do not need a camera to practice looking. Bring curiosity, leave the itinerary at home, and let one detail lead to the next.`,
    category: 'Creative practice', images: [{ id: 'sample-image-4', src: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1100&q=85', alt: 'Sunrise over a misty meadow', layout: 'featured' }],
    ...sampleAuthor, status: 'published', createdAt: '2026-09-26T09:00:00.000Z', updatedAt: '2026-09-26T09:00:00.000Z', publishedAt: '2026-09-26T09:00:00.000Z',
  },
]