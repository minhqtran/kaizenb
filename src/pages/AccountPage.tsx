import { ImagePlus, Save, Trash2 } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { UserAvatar } from "../components/UserAvatar";
import {
  removeImages,
  saveImage,
  validateImageFile,
} from "../services/imageStorage";
import { effectiveDisplayName } from "../types/user";

export function AccountPage() {
  const { user, updateProfile } = useAuth();
  const [nickname, setNickname] = useState(
    user?.nickname ?? user?.displayName ?? "",
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const url = imagePreview?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [imagePreview]);

  if (!user) return null;

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      validateImageFile(file);
      setSelectedImage(file);
      setImagePreview({ file, url: URL.createObjectURL(file) });
      setRemoveImage(false);
      setError("");
      setSuccess("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This image could not be used.",
      );
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const previousImageKey = user?.profileImageKey;
    let storedImageKey = "";
    let profileUpdated = false;
    try {
      let nextImageKey = removeImage ? null : (previousImageKey ?? null);
      if (selectedImage) {
        storedImageKey = await saveImage(selectedImage, "avatars");
        nextImageKey = storedImageKey;
      }
      await updateProfile(nickname, nextImageKey);
      profileUpdated = true;
      setSelectedImage(null);
      setImagePreview(null);
      setRemoveImage(false);
      setSuccess("Your profile has been updated.");
      if (previousImageKey && previousImageKey !== nextImageKey) {
        try {
          await removeImages([previousImageKey]);
        } catch (cleanupCause) {
          setError(
            cleanupCause instanceof Error
              ? `Profile updated, but old image cleanup failed: ${cleanupCause.message}`
              : "Profile updated, but the old image could not be removed.",
          );
        }
      }
    } catch (cause) {
      let message =
        cause instanceof Error ? cause.message : "Unable to update your profile.";
      if (storedImageKey && !profileUpdated) {
        try {
          await removeImages([storedImageKey]);
        } catch (cleanupCause) {
          const cleanupMessage =
            cleanupCause instanceof Error
              ? cleanupCause.message
              : "Unable to remove the unused uploaded image.";
          message = `${message} ${cleanupMessage}`;
        }
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const previewUrl =
    selectedImage && imagePreview?.file === selectedImage
      ? imagePreview.url
      : "";
  const previewAvatar = previewUrl ? (
    <img className="profile-avatar" src={previewUrl} alt="Profile preview" />
  ) : (
    <UserAvatar
      className="profile-avatar"
      displayName={effectiveDisplayName(user)}
      imageKey={removeImage ? undefined : user.profileImageKey}
      imageUrl={user.avatarUrl}
    />
  );

  return (
    <section className="account-page page-container">
      <header className="account-heading">
        <div className="eyebrow">
          Your account · {user.role === "admin" ? "Supreme Leader" : user.role}
        </div>
        <h1>Profile</h1>
        <p>Make this space feel like yours.</p>
      </header>
      <form className="profile-form" onSubmit={(event) => void submit(event)}>
        <div className="profile-avatar-field">
          <div className="profile-avatar-frame">{previewAvatar}</div>
          <div>
            <label className="button secondary image-add-button">
              <ImagePlus size={15} /> Change picture
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={chooseImage}
              />
            </label>
            <p className="form-hint">JPEG, PNG, WebP, or GIF · up to 8 MB</p>
            {(user.profileImageKey || user.avatarUrl) && (
              <button
                className="text-button profile-remove-image"
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                  setRemoveImage(true);
                  setSuccess("");
                  setError("");
                }}
              >
                <Trash2 size={13} /> Remove picture
              </button>
            )}
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="nickname">Nickname</label>
          <input
            id="nickname"
            required
            minLength={1}
            maxLength={40}
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value);
              setSuccess("");
            }}
          />
          <span className="form-hint">
            Shown beside your stories and across the site.
          </span>
        </div>
        <div className="form-field">
          <label htmlFor="account-email">Google account</label>
          <input id="account-email" value={user.email} readOnly />
          <span className="form-hint">
            Your sign-in identity stays separate from your public profile.
          </span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="success-message" role="status">
            {success}
          </p>
        )}
        <div className="form-actions">
          <button className="button" type="submit" disabled={saving}>
            <Save size={14} /> {saving ? "Saving profile..." : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}
