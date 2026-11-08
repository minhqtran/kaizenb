import { createClient } from "@supabase/supabase-js";
import type { BlogImage, BlogStatus, StoryBlock } from "../types/post";
import type { UserRole } from "../types/user";

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  nickname: string | null;
  profile_image_path: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  content_blocks: StoryBlock[];
  category: string;
  images: BlogImage[];
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  author_avatar_storage_key: string | null;
  status: BlogStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      posts: {
        Row: PostRow;
        Insert: Omit<PostRow, "id" | "created_at" | "updated_at" | "published_at"> &
          Partial<Pick<PostRow, "id" | "created_at" | "updated_at" | "published_at">>;
        Update: Partial<PostRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_user_role: {
        Args: { target_user_id: string; next_role: "viewer" | "writer" };
        Returns: undefined;
      };
      update_my_profile: {
        Args: {
          nickname_input: string;
          profile_image_path_input: string | null;
        };
        Returns: ProfileRow;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      can_write_content: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function isValidSupabaseUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseAnonKey && isValidSupabaseUrl(supabaseUrl),
);

let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Shared storage is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the app.",
    );
  }

  client ??= createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  return client;
}
