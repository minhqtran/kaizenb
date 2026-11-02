import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  ImagePlus,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { ArticleBody, BlogImageView } from "../components/BlogImageView";
import { UserAvatar } from "../components/UserAvatar";
import { removeImages, saveImage } from "../services/imageStorage";
import { createPost, getPost, updatePost } from "../services/posts";
import type {
  BlogImage,
  BlogImageLayout,
  BlogPost,
  BlogStatus,
  PostInput,
  StoryBlock,
} from "../types/post";
import { effectiveDisplayName } from "../types/user";

const emptyPost: PostInput = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  contentBlocks: [],
  images: [],
  category: "Thoughts",
  status: "draft",
};
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maximumImageSize = 8 * 1024 * 1024;
const layoutOptions: Array<{ value: BlogImageLayout; label: string }> = [
  { value: "featured", label: "Title image" },
  { value: "full-width", label: "Full-width image" },
  { value: "inline", label: "Inline image" },
  { value: "side-by-side", label: "Side-by-side gallery" },
  { value: "framed", label: "Framed image" },
];

export function PostEditorPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<PostInput>(() => ({
    ...emptyPost,
    contentBlocks: [{ id: crypto.randomUUID(), type: "markdown", content: "" }],
  }));
  const [loading, setLoading] = useState(Boolean(slug));
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [manualSlug, setManualSlug] = useState(Boolean(slug));
  const [focusedBlockId, setFocusedBlockId] = useState("");

  useEffect(() => {
    if (!slug || !user) return;
    getPost(slug, user)
      .then((post) => {
        setForm(toInput(post));
        setManualSlug(true);
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load this story.",
        ),
      )
      .finally(() => setLoading(false));
  }, [slug, user]);

  async function save(status: BlogStatus) {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const input = { ...form, slug: form.slug || form.title, status };
      const post = slug
        ? await updatePost(slug, input, user)
        : await createPost(input, user);
      await removeImages(removedImages);
      navigate(`/posts/${post.slug}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save this story.",
      );
      setSaving(false);
    }
  }

  async function handleImageSelection(event: FormEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    const invalid = files.find(
      (file) =>
        !allowedTypes.includes(file.type) || file.size > maximumImageSize,
    );
    if (invalid) {
      setError(
        !allowedTypes.includes(invalid.type)
          ? `${invalid.name} is not a supported image. Use JPEG, PNG, WebP, or GIF.`
          : `${invalid.name} is larger than 8 MB. Choose a smaller image.`,
      );
      return;
    }
    setError("");
    try {
      const added = await Promise.all(
        files.map(
          async (file): Promise<BlogImage> => ({
            id: crypto.randomUUID(),
            src: "",
            storageKey: await saveImage(file),
            alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
            layout: "full-width",
          }),
        ),
      );
      const imageBlocks = added.map(
        (image): StoryBlock => ({
          id: crypto.randomUUID(),
          type: "image",
          imageId: image.id,
        }),
      );
      setForm((current) => {
        const blocks = [...(current.contentBlocks ?? [])];
        const focusedIndex = blocks.findIndex(
          (block) => block.id === focusedBlockId && block.type === "markdown",
        );
        const hasTitleImage = current.images.some(
          (image) => image.layout === "featured",
        );
        const nextImages = [
          ...current.images,
          ...added.map((image, index) => ({
            ...image,
            ...(hasTitleImage || index > 0 ? {} : { layout: "featured" as const }),
          })),
        ];
        blocks.splice(
          focusedIndex < 0 ? blocks.length : focusedIndex + 1,
          0,
          ...imageBlocks,
        );
        return withContentBlocks(current, blocks, nextImages);
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to store these images.",
      );
    }
  }

  function updateField(
    field: "title" | "slug" | "excerpt" | "body" | "category",
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "title" && !manualSlug ? { slug: slugify(value) } : {}),
    }));
  }

  function updateMarkdownBlock(blockId: string, content: string) {
    setForm((current) => {
      const blocks = (current.contentBlocks ?? []).map((block) =>
        block.id === blockId && block.type === "markdown"
          ? { ...block, content }
          : block,
      );
      return withContentBlocks(current, blocks);
    });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setForm((current) => {
      const blocks = [...(current.contentBlocks ?? [])];
      const target = index + direction;
      if (target < 0 || target >= blocks.length) return current;
      [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
      return withContentBlocks(current, blocks);
    });
  }

  function removeBlock(blockId: string) {
    const block = form.contentBlocks?.find((item) => item.id === blockId);
    if (!block) return;
    const image =
      block.type === "image"
        ? form.images.find((item) => item.id === block.imageId)
        : undefined;
    if (
      image &&
      !window.confirm(
        `Remove this image${image.alt ? ` (${image.alt})` : ""} from the story?`,
      )
    )
      return;
    setForm((current) => {
      const blocks = (current.contentBlocks ?? []).filter(
        (item) => item.id !== blockId,
      );
      const images =
        block.type === "image"
          ? current.images.filter((item) => item.id !== block.imageId)
          : current.images;
      return withContentBlocks(current, blocks, images);
    });
    if (image?.storageKey)
      setRemovedImages((current) => [...current, image.storageKey!]);
  }

  function updateImage(imageId: string, patch: Partial<BlogImage>) {
    setForm((current) => ({
      ...current,
      images: current.images.map((image) => ({
        ...image,
        ...(patch.layout === "featured" &&
        image.id !== imageId &&
        image.layout === "featured"
          ? { layout: "full-width" as const }
          : {}),
        ...(image.id === imageId ? patch : {}),
      })),
    }));
  }

  function addTextBlock() {
    const block: StoryBlock = {
      id: crypto.randomUUID(),
      type: "markdown",
      content: "",
    };
    setForm((current) =>
      withContentBlocks(current, [...(current.contentBlocks ?? []), block]),
    );
    setFocusedBlockId(block.id);
  }

  if (loading)
    return <div className="editor-page loading-state">Loading editor...</div>;

  if (preview)
    return (
      <PostPreview
        form={form}
        authorName={user ? effectiveDisplayName(user) : "Writer"}
        authorAvatarUrl={user?.avatarUrl}
        authorAvatarStorageKey={user?.profileImageKey}
        onBack={() => setPreview(false)}
        onSaveDraft={() => save("draft")}
        onPublish={() => save("published")}
        saving={saving}
      />
    );

  return (
    <section className="editor-page">
      <Link className="back-link" to={slug ? `/posts/${slug}` : "/"}>
        <ArrowLeft size={14} /> Cancel and go back
      </Link>
      <div className="editor-heading">
        <div className="eyebrow">Your writing desk · {form.status}</div>
        <h1>{slug ? "Edit your story" : "Start a story"}</h1>
      </div>
      <form
        className="editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save("published");
        }}
      >
        <div className="form-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            required
            maxLength={180}
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Give your story a title"
          />
        </div>
        <div className="form-field">
          <label htmlFor="slug">Article URL slug</label>
          <input
            id="slug"
            required
            value={form.slug}
            onChange={(event) => {
              setManualSlug(true);
              updateField("slug", slugify(event.target.value));
            }}
            placeholder="story-url"
          />
          <span className="form-hint">
            Generated from the title; edit it if you need a custom URL.
          </span>
        </div>
        <div className="form-field">
          <label htmlFor="excerpt">Short introduction</label>
          <textarea
            id="excerpt"
            required
            maxLength={280}
            rows={3}
            value={form.excerpt}
            onChange={(event) => updateField("excerpt", event.target.value)}
            placeholder="What is this story about?"
          />
          <span className="form-hint">
            A sentence or two shown on the story list.
          </span>
        </div>
        <div className="form-field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
          >
            <option>Music</option>
            <option>Thoughts</option>
            <option>Film</option>
            <option>Life & culture</option>
            <option>Travel notes</option>
            <option>At the table</option>
            <option>Creative practice</option>
          </select>
        </div>
        <section
          className="content-block-manager"
          aria-labelledby="content-block-title"
        >
          <div className="image-manager-heading">
            <div>
              <label id="content-block-title">Story content</label>
              <p className="form-hint">
                Paste Markdown into text blocks. Images are inserted after the
                focused text block. Use one image as the Title image for the
                story cover.
              </p>
            </div>
            <div className="content-block-add-actions">
              <button
                className="button secondary"
                type="button"
                onClick={addTextBlock}
              >
                <Plus size={14} /> Add text
              </button>
              <label className="button secondary image-add-button">
                <ImagePlus size={15} /> Add images
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(event) => void handleImageSelection(event)}
                />
              </label>
            </div>
          </div>
          {!form.contentBlocks?.length && (
            <div className="image-empty-state">
              Add a text or image block to begin.
            </div>
          )}
          <div className="content-block-list">
            {(form.contentBlocks ?? []).map((block, index) => {
              const image =
                block.type === "image"
                  ? form.images.find((item) => item.id === block.imageId)
                  : undefined;
              return (
                <article
                  className={`content-block-row${block.type === "image" ? " image-content-block" : ""}`}
                  key={block.id}
                >
                  <div className="content-block-toolbar">
                    <span>
                      {block.type === "markdown" ? "Markdown" : "Image"} ·{" "}
                      {index + 1}
                    </span>
                    <div className="image-row-actions">
                      <button
                        className="icon-button"
                        type="button"
                        title="Move block up"
                        aria-label={`Move block ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => moveBlock(index, -1)}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        title="Move block down"
                        aria-label={`Move block ${index + 1} down`}
                        disabled={index === form.contentBlocks!.length - 1}
                        onClick={() => moveBlock(index, 1)}
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        className="icon-button remove-image-button"
                        type="button"
                        title="Remove block"
                        aria-label={`Remove block ${index + 1}`}
                        onClick={() => removeBlock(block.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {block.type === "markdown" ? (
                    <textarea
                      aria-label={`Markdown text block ${index + 1}`}
                      value={block.content}
                      onFocus={() => setFocusedBlockId(block.id)}
                      onChange={(event) =>
                        updateMarkdownBlock(block.id, event.target.value)
                      }
                      placeholder="Write or paste Markdown..."
                    />
                  ) : image ? (
                    <div className="content-image-fields">
                      <BlogImageView image={image} />
                      <div className="image-editor-fields">
                        <div className="form-field">
                          <label htmlFor={`alt-${image.id}`}>
                            Alternative text
                          </label>
                          <input
                            id={`alt-${image.id}`}
                            required
                            value={image.alt}
                            onChange={(event) =>
                              updateImage(image.id, { alt: event.target.value })
                            }
                            placeholder="Describe the image"
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor={`caption-${image.id}`}>
                            Caption (optional)
                          </label>
                          <input
                            id={`caption-${image.id}`}
                            value={image.caption ?? ""}
                            onChange={(event) =>
                              updateImage(image.id, {
                                caption: event.target.value,
                              })
                            }
                            placeholder="Add a caption"
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor={`layout-${image.id}`}>
                            Image layout
                          </label>
                          <select
                            id={`layout-${image.id}`}
                            value={image.layout}
                            onChange={(event) =>
                              updateImage(image.id, {
                                layout: event.target.value as BlogImageLayout,
                              })
                            }
                          >
                            {layoutOptions.map((option) => (
                              <option value={option.value} key={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <span className="form-hint">
                            Set this to “Title image” to use it as the story cover.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="form-error">
                      This image block is missing its image.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions editor-actions">
          <button
            className="button secondary"
            type="button"
            disabled={saving}
            onClick={() => setPreview(true)}
          >
            <Eye size={14} /> Preview
          </button>
          <button
            className="button secondary"
            type="button"
            disabled={saving}
            onClick={() => void save("draft")}
          >
            Save draft
          </button>
          <button className="button" type="submit" disabled={saving}>
            <Send size={14} /> {saving ? "Saving..." : "Publish story"}
          </button>
          <Link
            className="text-link"
            to={slug ? `/posts/${slug}` : "/my-stories"}
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

function PostPreview({
  form,
  authorName,
  authorAvatarUrl,
  authorAvatarStorageKey,
  onBack,
  onSaveDraft,
  onPublish,
  saving,
}: {
  form: PostInput;
  authorName: string;
  authorAvatarUrl?: string;
  authorAvatarStorageKey?: string;
  onBack: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  saving: boolean;
}) {
  return (
    <div className="article-page preview-page">
      <button className="back-link preview-back" type="button" onClick={onBack}>
        <ArrowLeft size={14} /> Back to editor
      </button>
      <div className="article-actions preview-actions">
        <button
          className="button secondary"
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
        >
          Save draft
        </button>
        <button
          className="button"
          type="button"
          onClick={onPublish}
          disabled={saving}
        >
          <Send size={14} /> {saving ? "Saving..." : "Publish story"}
        </button>
      </div>
      <header className="article-header">
        <div className="eyebrow">{form.category} · Preview</div>
        <h1>{form.title || "Untitled story"}</h1>
        <p className="article-excerpt">
          {form.excerpt || "Your introduction will appear here."}
        </p>
        <div className="article-byline">
          {(authorAvatarUrl || authorAvatarStorageKey) && (
            <UserAvatar
              className="author-avatar"
              displayName={authorName}
              imageKey={authorAvatarStorageKey}
              imageUrl={authorAvatarUrl}
            />
          )}
          <span>
            <strong>{authorName}</strong>
            <br />
            Preview · {readingTime(form.body)} min read
          </span>
        </div>
      </header>
      <ArticleBody
        body={form.body || "Your story will appear here."}
        images={form.images}
        contentBlocks={form.contentBlocks}
      />
    </div>
  );
}

function toInput(post: BlogPost): PostInput {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    body: post.body,
    contentBlocks: post.contentBlocks ?? [],
    images: post.images,
    category: post.category,
    status: post.status,
  };
}

function withContentBlocks(
  form: PostInput,
  contentBlocks: StoryBlock[],
  images = form.images,
): PostInput {
  return {
    ...form,
    images,
    contentBlocks,
    body: contentBlocks
      .filter((block) => block.type === "markdown")
      .map((block) => block.content)
      .join("\n\n"),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readingTime(body: string) {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200));
}
