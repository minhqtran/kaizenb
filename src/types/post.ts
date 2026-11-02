export type BlogStatus = "draft" | "published";
export type BlogImageLayout =
  | "featured"
  | "full-width"
  | "inline"
  | "side-by-side"
  | "framed";

export interface BlogImage {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  layout: BlogImageLayout;
  storageKey?: string;
}

export type StoryBlock =
  | { id: string; type: "markdown"; content: string }
  | { id: string; type: "image"; imageId: string };

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  contentBlocks?: StoryBlock[];
  category: string;
  images: BlogImage[];
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorAvatarStorageKey?: string;
  status: BlogStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type PostInput = Pick<
  BlogPost,
  "title" | "slug" | "excerpt" | "body" | "images" | "category" | "status"
> & { contentBlocks?: StoryBlock[] };
