import { useEffect, useState } from "react";
import { getImage } from "../services/imageStorage";

export function UserAvatar({
  className,
  displayName,
  imageKey,
  imageUrl,
}: {
  className: string;
  displayName: string;
  imageKey?: string;
  imageUrl?: string;
}) {
  const [storedImage, setStoredImage] = useState<{ key: string; url: string }>({
    key: "",
    url: "",
  });

  useEffect(() => {
    if (!imageKey) return;
    let active = true;
    let objectUrl = "";
    getImage(imageKey)
      .then((blob) => {
        if (!blob || !active) return;
        objectUrl = URL.createObjectURL(blob);
        setStoredImage({ key: imageKey, url: objectUrl });
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageKey]);

  const source = imageKey
    ? storedImage.key === imageKey
      ? storedImage.url
      : ""
    : imageUrl;
  return source ? (
    <img className={className} src={source} alt="" />
  ) : (
    <span
      className={`${className} avatar-fallback`}
      role="img"
      aria-label={displayName}
    >
      {displayName.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
