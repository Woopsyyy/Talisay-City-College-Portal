import { supabase } from "../../supabaseClient";

const AVATAR_BUCKET = import.meta.env.VITE_SUPABASE_AVATAR_BUCKET || "avatars";
const DEFAULT_AVATAR = "/images/sample.jpg";

const normalizeImageStoragePath = (value: unknown): string => {
  if (!value) return "";

  let cleaned = String(value).trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://") || cleaned.startsWith("data:")) {
    return "";
  }

  cleaned = cleaned.replace(/^\/+/, "");
  cleaned = cleaned.replace(/^TCC\/public\//i, "");
  cleaned = cleaned.replace(/^public\//i, "");
  cleaned = cleaned.replace(/^uploads\/profiles\//i, "");

  if (!cleaned || cleaned.startsWith("images/")) return "";
  return cleaned;
};

export const getAvatarUrl = async (_userId: unknown, imagePath: unknown): Promise<string> => {
  try {
    if (!imagePath) return DEFAULT_AVATAR;
    const raw = String(imagePath).trim();

    if (!raw) return DEFAULT_AVATAR;
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
      return raw;
    }

    if (raw.startsWith("/images/") || raw.startsWith("images/")) {
      return raw.startsWith("/") ? raw : `/${raw}`;
    }

    const cleaned = normalizeImageStoragePath(raw);
    if (!cleaned) return DEFAULT_AVATAR;

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(cleaned);
    return data?.publicUrl || DEFAULT_AVATAR;
  } catch (_) {
    return DEFAULT_AVATAR;
  }
};

