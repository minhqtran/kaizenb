import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BlogImageView } from "../components/BlogImageView";
import { UserAvatar } from "../components/UserAvatar";
import { getPosts } from "../services/posts";
import type { BlogPost } from "../types/post";
import { formatDate } from "../utils/formatDate";

const categories = ["All stories", "Music", "Films", "Thoughts"];

export function HomePage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [category, setCategory] = useState("All stories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getPosts()
      .then(setPosts)
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load stories.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const featured = posts[0];
  const visiblePosts = posts.filter(
    (post) => category === "All stories" || post.category === category,
  );
  const cardPosts = visiblePosts.filter((post) => post.id !== featured?.id);

  return (
    <div className="page-container">
      <section className="home-intro">
        <div>
          <div className="eyebrow">A journal for many-thoughts people</div>
          <h1>
            You can write it here
            <br />
            or die <em>boring</em>
          </h1>
        </div>
        <p className="intro-copy">
          Every topics, ideas, and stories are welcome. Except for politics (Do
          not make a free app banned).
        </p>
      </section>
      {loading && (
        <div className="loading-state">Gathering the latest stories...</div>
      )}
      {error && (
        <div className="error-state" role="alert">
          {error}
          <br />
          Check the Django API or enable mock mode in your environment.
        </div>
      )}
      {!loading && !error && featured && (
        <section className="featured-story" aria-label="Featured story">
          <Link
            className="featured-image"
            to={`/posts/${featured.slug}`}
            aria-label={`Read ${featured.title}`}
          >
            {featured.images.find((image) => image.layout === "featured") && (
              <BlogImageView
                image={
                  featured.images.find((image) => image.layout === "featured")!
                }
              />
            )}
          </Link>
          <div className="featured-copy">
            <div className="eyebrow">Editor's letter · {featured.category}</div>
            <h2>{featured.title}</h2>
            <p>{featured.excerpt}</p>
            <div className="featured-meta">
              {(featured.authorAvatarUrl ||
                featured.authorAvatarStorageKey) && (
                <UserAvatar
                  className="author-avatar"
                  displayName={featured.authorName}
                  imageKey={featured.authorAvatarStorageKey}
                  imageUrl={featured.authorAvatarUrl}
                />
              )}
              <span>
                {featured.authorName && `${featured.authorName} · `}
                {formatDate(featured.publishedAt ?? featured.createdAt)} ·{" "}
                {readingTime(featured.body)} min read
              </span>
            </div>
            <div style={{ marginTop: 22 }}>
              <Link className="text-link" to={`/posts/${featured.slug}`}>
                Read the story <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}
      <section className="story-toolbar" aria-label="Story categories">
        <h2>Recent stories</h2>
        <div className="category-list">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`category-button${category === item ? " active" : ""}`}
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      {loading || error ? null : cardPosts.length > 0 ? (
        <div className="post-grid">
          {cardPosts.map((post) => (
            <article className="post-card" key={post.id}>
              <Link
                className="post-card-image"
                to={`/posts/${post.slug}`}
                aria-label={post.title}
              >
                {post.images.find((image) => image.layout === "featured") && (
                  <BlogImageView
                    image={
                      post.images.find((image) => image.layout === "featured")!
                    }
                  />
                )}
              </Link>
              <div className="section-kicker">{post.category}</div>
              <h3>
                <Link to={`/posts/${post.slug}`}>{post.title}</Link>
              </h3>
              <p>{post.excerpt}</p>
              <div className="card-meta">
                {post.authorName} ·{" "}
                {formatDate(post.publishedAt ?? post.createdAt)} ·{" "}
                {readingTime(post.body)} min read
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">No stories in this category just yet.</div>
      )}
    </div>
  );
}

function readingTime(body: string) {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200));
}
