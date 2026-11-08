import { Copy } from "lucide-react";
import { useState } from "react";
import { createPostUrl } from "../utils/postUrl";

export function CopyPostLinkButton({
  slug,
  repositoryHosted = false,
}: {
  slug: string;
  repositoryHosted?: boolean;
}) {
  const [message, setMessage] = useState("");

  async function copyLink() {
    if (!navigator.clipboard?.writeText) {
      setMessage(
        "Clipboard access is unavailable. Copy the page URL from your address bar.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        createPostUrl(slug, window.location.origin),
      );
      setMessage(
        repositoryHosted
          ? "Link copied. This post is hosted publicly."
          : "Link copied. This post is stored in this browser, so others may not be able to open it yet.",
      );
    } catch {
      setMessage(
        "Unable to copy the link. Copy the page URL from your address bar instead.",
      );
    }
  }

  return (
    <div className="copy-link-action">
      <button
        className="button secondary"
        type="button"
        onClick={() => void copyLink()}
      >
        <Copy size={14} /> Copy link
      </button>
      {message && (
        <span className="copy-link-status" role="status">
          {message}
        </span>
      )}
    </div>
  );
}
