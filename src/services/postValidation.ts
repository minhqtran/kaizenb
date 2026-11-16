import type { BlogImage, PostInput, StoryBlock } from "../types/post";

export function legacyContentBlocks(body: string, images: BlogImage[]): StoryBlock[] {
  const blocks: StoryBlock[] = [];
  const inlineImages = images.filter((image) => image.layout === "inline");
  let inlineIndex = 0;
  images
    .filter((image) => image.layout === "featured")
    .forEach((image) =>
      blocks.push({ id: `image-${image.id}`, type: "image", imageId: image.id }),
    );
  body
    .split(/\n\s*\n/)
    .filter(Boolean)
    .forEach((content, index) => {
      blocks.push({ id: `text-${index}`, type: "markdown", content });
      const image = inlineImages[inlineIndex++];
      if (image)
        blocks.push({ id: `image-${image.id}`, type: "image", imageId: image.id });
    });
  inlineImages.slice(inlineIndex).forEach((image) =>
    blocks.push({ id: `image-${image.id}`, type: "image", imageId: image.id }),
  );
  images
    .filter((image) => image.layout !== "featured" && image.layout !== "inline")
    .forEach((image) =>
      blocks.push({ id: `image-${image.id}`, type: "image", imageId: image.id }),
    );
  return blocks;
}

export function validatePostInput(input: PostInput) {
  if (input.status !== "published") return;
  const text =
    input.contentBlocks
      ?.filter((block) => block.type === "markdown")
      .map((block) => block.content)
      .join("\n\n") ?? input.body;
  if (!input.title.trim() || !input.excerpt.trim() || text.trim().length < 20)
    throw new Error(
      "Publishing requires a title, short introduction, and at least 20 characters of story text.",
    );
  if (input.images.some((image) => !image.alt.trim()))
    throw new Error("Add alternative text to every image before publishing.");
}