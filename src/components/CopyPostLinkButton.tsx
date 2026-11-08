import { Copy } from "lucide-react";
import { useState } from "react";
import { createPostUrl } from "../utils/postUrl";

export function CopyPostLinkButton({ slug }: { slug: string }) {
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
      setMessage("Link copied. Anyone can open published stories.");
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
