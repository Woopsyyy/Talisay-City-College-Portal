import bcrypt from "bcryptjs";
import { supabase } from "../supabaseClient";

const SESSION_KEY = "tcc_user";
const AVATAR_BUCKET = import.meta.env.VITE_SUPABASE_AVATAR_BUCKET || "avatars";
const BACKUP_BUCKET = import.meta.env.VITE_SUPABASE_BACKUP_BUCKET || AVATAR_BUCKET;
const BACKUP_PREFIX = String(import.meta.env.VITE_SUPABASE_BACKUP_PREFIX || "backups")
  .replace(/^\/+/, "")
  .replace(/\/+$/, "");
const DEFAULT_AVATAR = "/images/sample.jpg";

let activeRequests = 0;
const loadingSubscribers = new Set();
const unauthorizedSubscribers = new Set();

const emitLoading = () => {
  const active = activeRequests > 0;
  loadingSubscribers.forEach((callback) => {
    try {
      callback(active);
    } catch (_) {}
  });
};

const emitUnauthorized = () => {
  unauthorizedSubscribers.forEach((callback) => {
    try {
      callback();
    } catch (_) {}
  });
};

export const subscribeToApiLoading = (callback) => {
  loadingSubscribers.add(callback);
  callback(activeRequests > 0);
  return () => loadingSubscribers.delete(callback);
};

export const subscribeToUnauthorized = (callback) => {
  unauthorizedSubscribers.add(callback);
  return () => unauthorizedSubscribers.delete(callback);
};

const asError = (input, fallback = "Request failed") => {
  if (input instanceof Error) return input;
  const error = new Error(input?.message || fallback);
  if (input?.status) error.status = input.status;
  if (input?.code) error.code = input.code;
  return error;
};

const formatSupabaseError = (error, fallback = "Database request failed") => {
  if (!error) return null;
  const formatted = new Error(error.message || fallback);
  formatted.status = error.status || 400;
  formatted.code = error.code;
  return formatted;
};

const withApi = async (fn, { silent = false } = {}) => {
  if (!silent) {
    activeRequests += 1;
    emitLoading();
  }

  try {
    return await fn();
  } catch (error) {
    throw asError(error);
  } finally {
    if (!silent) {
      activeRequests = Math.max(0, activeRequests - 1);
      emitLoading();
    }
  }
};

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw || raw === "undefined") return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

const writeStoredUser = (user) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (_) {}
};

const clearStoredUser = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("tcc_avatar");
  } catch (_) {}
};

const requireStoredUser = () => {
  const user = readStoredUser();
  if (!user?.id) {
    const err = new Error("Not authenticated");
    err.status = 401;
    throw err;
  }
  return user;
};

const normalizeListValue = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {}
    }
    return trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeRole = (role) => {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();
  return normalized === "go" ? "nt" : normalized;
};

const normalizeRoles = (rolesLike, fallbackRole = "student") => {
  const roles = normalizeListValue(rolesLike)
    .map(normalizeRole)
    .filter(Boolean);
  if (!roles.length) {
    const single = normalizeRole(fallbackRole);
    return [single || "student"];
  }
  return Array.from(new Set(roles));
};

const normalizeSubRoles = (subRolesLike, fallbackSubRole = null) => {
  const subRoles = normalizeListValue(subRolesLike)
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
  if (subRoles.length) return Array.from(new Set(subRoles));
  return fallbackSubRole ? [String(fallbackSubRole).trim().toLowerCase()] : [];
};

const normalizeUser = (row) => {
  if (!row) return null;

  const roles = normalizeRoles(row.roles, row.role || "student");
  const subRoles = normalizeSubRoles(row.sub_roles, row.sub_role);

  return {
    ...row,
    role: roles[0] || "student",
    roles,
    sub_role: subRoles[0] || null,
    sub_roles: subRoles,
  };
};

const normalizeYearLevel = (value) => {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const match = raw.match(/^(\d)/);
  return match ? match[1] : raw;
};

const normalizeSemester = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "1st Semester";
  if (raw.includes("2") || raw.includes("second")) return "2nd Semester";
  if (raw.includes("summer")) return "Summer";
  return "1st Semester";
};

const currentSchoolYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() >= 5 ? year : year - 1;
  return `${start}-${start + 1}`;
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const isMissingRelation = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42P01" || message.includes("does not exist");
};

const normalizeBcryptHash = (hash) => {
  if (!hash) return "";
  if (hash.startsWith("$2y$")) return `$2a$${hash.slice(4)}`;
  return hash;
};

const sanitizeLike = (value) =>
  String(value || "")
    .replace(/[%_,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseNumber = (value, fallback = null) => {
  if (value == null || value === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toBoolean = (value, fallback = true) => {
  if (value == null) return fallback;
  if (typeof value === "boolean") return value;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "enabled"].includes(raw)) return true;
  if (["0", "false", "no", "disabled"].includes(raw)) return false;
  return fallback;
};

const mapSubject = (row) => ({
  ...row,
  subject_code: row.subject_code || "",
  subject_name: row.subject_name || row.title || "",
  title: row.title || row.subject_name || "",
  units: parseNumber(row.units, 0),
  year_level: parseNumber(row.year_level, null),
});

const mapSection = (row) => ({
  ...row,
  name: row.section_name,
  year: normalizeYearLevel(row.grade_level),
  grade_level: normalizeYearLevel(row.grade_level),
});

const mapBuilding = (row) => ({
  ...row,
  name: row.building_name,
  floors: parseNumber(row.num_floors, 1),
  rooms_per_floor: parseNumber(row.rooms_per_floor, 10),
});

const mapProject = (row) => ({
  ...row,
  name: row.name || row.title || "",
  title: row.title || row.name || "",
  started: row.start_date || null,
  start_date: row.start_date || null,
});

const normalizeImageStoragePath = (value) => {
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

const buildAvatarStoragePath = (userId, filename) => {
  const ownerId = String(userId || "").trim();
  if (!/^\d+$/.test(ownerId)) {
    throw new Error("Invalid user id for avatar upload.");
  }
  const safeName = String(filename || "avatar")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+/, "");
  return `profiles/${ownerId}/${Date.now()}_${safeName || "avatar"}`;
};

const extractAvatarOwnerId = (storagePath) => {
  const normalized = String(storagePath || "")
    .trim()
    .replace(/^\/+/, "");
  const match = normalized.match(/^profiles\/(\d+)\//i);
  return match ? match[1] : "";
};

const normalizeAvatarPathForUser = (userId, imagePath) => {
  const normalized = normalizeImageStoragePath(imagePath);
  if (!normalized) return "";

  const ownerId = String(userId || "").trim();
  if (!/^\d+$/.test(ownerId)) return "";

  if (normalized.startsWith(`profiles/${ownerId}/`)) return normalized;
  if (normalized.startsWith(`${ownerId}/`)) return `profiles/${normalized}`;
  return "";
};

const chunkArray = (list, chunkSize = 100) => {
  const items = Array.isArray(list) ? list : [];
  const size = Math.max(1, Number(chunkSize) || 100);
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const listStorageFilesRecursive = async (bucket, rootPrefix = "") => {
  const files = [];
  const queue = [
    String(rootPrefix || "")
      .replace(/^\/+/, "")
      .replace(/\/+$/, ""),
  ];

  while (queue.length > 0) {
    const prefix = queue.shift();
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix || "", { limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } });

    if (error) {
      const message = String(error.message || "").toLowerCase();
      const missingBucket = message.includes("bucket") && message.includes("not");
      if (String(error.statusCode || "") === "404" || missingBucket) return files;
      throw formatSupabaseError(error);
    }

    for (const entry of data || []) {
      const entryName = String(entry?.name || "").trim();
      if (!entryName || entryName === "." || entryName === "..") continue;

      const fullPath = [prefix, entryName].filter(Boolean).join("/");
      const isFolder = entry?.id == null && entry?.metadata == null;
      if (isFolder) {
        queue.push(fullPath);
        continue;
      }

      files.push({
        ...entry,
        full_path: fullPath,
      });
    }
  }

  return files;
};

const fetchUsersByIds = async (ids) => {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return new Map();
  const { data, error } = await supabase.from("users").select("*").in("id", unique);
  if (error) throw formatSupabaseError(error);
  const map = new Map();
  (data || []).forEach((row) => map.set(row.id, normalizeUser(row)));
  return map;
};

const fetchSectionsByIds = async (ids) => {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return new Map();
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .in("id", unique);
  if (error) throw formatSupabaseError(error);
  const map = new Map();
  (data || []).forEach((row) => map.set(row.id, mapSection(row)));
  return map;
};

const fetchSubjectsByIds = async (ids) => {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return new Map();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .in("id", unique);
  if (error) throw formatSupabaseError(error);
  const map = new Map();
  (data || []).forEach((row) => map.set(row.id, mapSubject(row)));
  return map;
};

const fetchBuildingsByIds = async (ids) => {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return new Map();
  const { data, error } = await supabase
    .from("buildings")
    .select("*")
    .in("id", unique);
  if (error) throw formatSupabaseError(error);
  const map = new Map();
  (data || []).forEach((row) => map.set(row.id, mapBuilding(row)));
  return map;
};

const findSection = async ({ sectionId = null, sectionName = "", year = "" } = {}) => {
  if (sectionId) {
    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .eq("id", sectionId)
      .limit(1)
      .maybeSingle();
    if (error) throw formatSupabaseError(error);
    return data ? mapSection(data) : null;
  }

  if (!sectionName) return null;

  const normalizedYear = normalizeYearLevel(year);
  let query = supabase.from("sections").select("*").ilike("section_name", sectionName);
  if (normalizedYear) query = query.eq("grade_level", normalizedYear);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw formatSupabaseError(error);
  return data ? mapSection(data) : null;
};

const findSubjectByCode = async (subjectCode) => {
  if (!subjectCode) return null;
  const code = String(subjectCode).trim();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("subject_code", code)
    .limit(1)
    .maybeSingle();
  if (error) throw formatSupabaseError(error);
  return data ? mapSubject(data) : null;
};

const upsertSetting = async (settingKey, settingValue, description = "") => {
  const payload = {
    setting_key: settingKey,
    setting_value: settingValue,
    description,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await supabase
    .from("evaluation_settings")
    .update(payload)
    .eq("setting_key", settingKey)
    .select("id");

  if (updateError) throw formatSupabaseError(updateError);
  if ((updated || []).length > 0) return true;

  const { error: insertError } = await supabase
    .from("evaluation_settings")
    .insert(payload);
  if (insertError) throw formatSupabaseError(insertError);
  return true;
};

const safeUserUpdate = async (userId, payload) => {
  const mutable = { ...payload };

  while (Object.keys(mutable).length > 0) {
    const { data, error } = await supabase
      .from("users")
      .update(mutable)
      .eq("id", userId)
      .select("*")
      .single();

    if (!error) return data;

    const message = String(error.message || "");
    const missingColumn =
      message.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i)?.[1] ||
      message.match(/could not find the ['"]([a-zA-Z0-9_]+)['"] column/i)?.[1];

    if (missingColumn && Object.prototype.hasOwnProperty.call(mutable, missingColumn)) {
      delete mutable[missingColumn];
      continue;
    }

    throw formatSupabaseError(error);
  }

  throw new Error("No valid user columns to update.");
};

export const getAvatarUrl = async (_userId, imagePath) => {
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

export const AuthAPI = {
  login: async (username, password) =>
    withApi(async () => {
      if (!username || !password) {
        throw new Error("Username and password are required.");
      }

      const identifier = String(username).trim();

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", identifier)
        .limit(1);

      if (error) throw formatSupabaseError(error);
      let userRow = data?.[0] || null;

      if (!userRow && identifier.includes("@")) {
        const { data: byEmail, error: emailError } = await supabase
          .from("users")
          .select("*")
          .eq("email", identifier)
          .limit(1);
        if (emailError) throw formatSupabaseError(emailError);
        userRow = byEmail?.[0] || null;
      }

      if (!userRow) {
        const { count, error: countError } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });
        if (!countError && (count || 0) === 0) {
          throw new Error(
            "No users are visible in Supabase. Import user data (postgres_data.sql) or check RLS/policies on public.users.",
          );
        }
        throw new Error("Invalid username or password.");
      }

      const valid = await bcrypt.compare(password, normalizeBcryptHash(userRow.password));
      if (!valid) throw new Error("Invalid username or password.");

      const user = normalizeUser(userRow);
      writeStoredUser(user);
      return { success: true, user };
    }),

  signup: async (userData) =>
    withApi(async () => {
      const isForm = userData instanceof FormData;
      const fullName = isForm
        ? userData.get("full_name") || userData.get("name")
        : userData?.full_name || userData?.name;
      const username = isForm ? userData.get("username") : userData?.username;
      const email = isForm ? userData.get("email") : userData?.email;
      const password = isForm ? userData.get("password") : userData?.password;
      const role = isForm ? userData.get("role") : userData?.role;
      const imageFile = isForm
        ? userData.get("profile_picture") || userData.get("profile_image")
        : null;

      if (!fullName || !username || !email || !password) {
        throw new Error("Please provide full name, username, email, and password.");
      }

      const { data: usernameCheck, error: usernameError } = await supabase
        .from("users")
        .select("id")
        .eq("username", String(username).trim())
        .limit(1);
      if (usernameError) throw formatSupabaseError(usernameError);
      if ((usernameCheck || []).length > 0) throw new Error("Username already exists.");

      const { data: emailCheck, error: emailError } = await supabase
        .from("users")
        .select("id")
        .eq("email", String(email).trim())
        .limit(1);
      if (emailError) throw formatSupabaseError(emailError);
      if ((emailCheck || []).length > 0) throw new Error("Email already exists.");

      const hashedPassword = await bcrypt.hash(String(password), 12);
      const schoolId =
        (isForm ? userData.get("school_id") : userData?.school_id) ||
        `${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const insertPayload = {
        username: String(username).trim(),
        password: hashedPassword,
        email: String(email).trim(),
        full_name: String(fullName).trim(),
        role: String(role || "student").toLowerCase(),
        school_id: String(schoolId),
        image_path: DEFAULT_AVATAR,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("users")
        .insert(insertPayload)
        .select("*")
        .single();
      if (insertError) throw formatSupabaseError(insertError);

      let finalRow = inserted;
      if (imageFile instanceof File && imageFile.size > 0) {
        const storagePath = buildAvatarStoragePath(inserted.id, imageFile.name);
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(storagePath, imageFile, { upsert: true });
        if (!uploadError) {
          finalRow = await safeUserUpdate(inserted.id, { image_path: storagePath });
        }
      }

      return { success: true, user: normalizeUser(finalRow) };
    }),

  resetPassword: async (username) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("username", String(username || "").trim())
        .limit(1)
        .maybeSingle();

      if (error) throw formatSupabaseError(error);
      if (!data) throw new Error("User not found.");

      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
      let generated = "";
      for (let i = 0; i < 10; i += 1) {
        generated += chars[Math.floor(Math.random() * chars.length)];
      }

      const hashed = await bcrypt.hash(generated, 12);
      const { error: updateError } = await supabase
        .from("users")
        .update({ password: hashed, updated_at: new Date().toISOString() })
        .eq("id", data.id);
      if (updateError) throw formatSupabaseError(updateError);

      return { success: true, new_password: generated };
    }),

  updateProfile: async (profileData) => {
    try {
      return await withApi(async () => {
        const currentUser = requireStoredUser();
        const isForm = profileData instanceof FormData;
        const username = isForm ? profileData.get("username") : profileData?.username;
        const fullName = isForm ? profileData.get("full_name") : profileData?.full_name;
        const gender = isForm ? profileData.get("gender") : profileData?.gender;
        const password = isForm ? profileData.get("password") : profileData?.password;
        const imageFile = isForm
          ? profileData.get("profile_image") || profileData.get("profile_picture")
          : null;

        const updates = { updated_at: new Date().toISOString() };
        if (username) updates.username = String(username).trim();
        if (fullName) updates.full_name = String(fullName).trim();
        if (gender) updates.gender = String(gender).trim();

        if (updates.username && updates.username !== currentUser.username) {
          const { data: existingUsername, error: existingError } = await supabase
            .from("users")
            .select("id")
            .eq("username", updates.username)
            .neq("id", currentUser.id)
            .limit(1);
          if (existingError) throw formatSupabaseError(existingError);
          if ((existingUsername || []).length > 0) {
            throw new Error("Username is already taken.");
          }
        }

        if (password) {
          updates.password = await bcrypt.hash(String(password), 12);
        }

        if (imageFile instanceof File && imageFile.size > 0) {
          const storagePath = buildAvatarStoragePath(currentUser.id, imageFile.name);
          const { error: uploadError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .upload(storagePath, imageFile, { upsert: true });
          if (uploadError) throw formatSupabaseError(uploadError, "Failed to upload avatar.");
          updates.image_path = storagePath;
        }

        const updatedRow = await safeUserUpdate(currentUser.id, updates);
        const normalized = normalizeUser(updatedRow);
        writeStoredUser(normalized);
        const avatar = await getAvatarUrl(normalized.id, normalized.image_path);

        return { success: true, user: normalized, avatar_url: avatar };
      });
    } catch (error) {
      return { success: false, error: error.message || "Failed to update profile." };
    }
  },

  checkSession: async () =>
    withApi(async () => {
      const stored = readStoredUser();
      if (!stored?.id) return { authenticated: false, user: null };

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", stored.id)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        clearStoredUser();
        emitUnauthorized();
        return { authenticated: false, user: null };
      }

      const user = normalizeUser(data);
      writeStoredUser(user);
      return { authenticated: true, user };
    }),

  logout: async () =>
    withApi(async () => {
      clearStoredUser();
      emitUnauthorized();
      return { success: true };
    }, { silent: true }),

  check: async () => AuthAPI.checkSession(),
};

export const PublicAPI = {
  getStats: async () =>
    withApi(async () => {
      const [usersCount, buildingsCount, subjectsCount, sectionsCount] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("buildings").select("*", { count: "exact", head: true }),
        supabase.from("subjects").select("*", { count: "exact", head: true }),
        supabase.from("sections").select("*", { count: "exact", head: true }),
      ]);

      return {
        users: usersCount.count || 0,
        buildings: buildingsCount.count || 0,
        subjects: subjectsCount.count || 0,
        sections: sectionsCount.count || 0,
      };
    }),
};

const mapAnnouncement = (row) => ({
  ...row,
  priority: row.priority || "medium",
  target_role: row.target_role || "all",
  is_published: row.is_published == null ? 1 : row.is_published,
});

const mapScheduleRows = async (scheduleRows) => {
  const rows = scheduleRows || [];
  if (!rows.length) return [];

  const sectionIds = rows.map((row) => row.section_id).filter(Boolean);
  const teacherAssignmentIds = rows.map((row) => row.teacher_assignment_id).filter(Boolean);
  const subjectCodes = Array.from(new Set(rows.map((row) => row.subject_code).filter(Boolean)));

  const [sectionsMap, teacherAssignmentsResult, sectionAssignmentsResult, subjectsResult] =
    await Promise.all([
      fetchSectionsByIds(sectionIds),
      teacherAssignmentIds.length
        ? supabase
            .from("teacher_assignments")
            .select("*")
            .in("id", teacherAssignmentIds)
        : Promise.resolve({ data: [], error: null }),
      sectionIds.length
        ? supabase
            .from("section_assignments")
            .select("*")
            .in("section_id", sectionIds)
        : Promise.resolve({ data: [], error: null }),
      subjectCodes.length
        ? supabase
            .from("subjects")
            .select("*")
            .in("subject_code", subjectCodes)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (teacherAssignmentsResult.error) throw formatSupabaseError(teacherAssignmentsResult.error);
  if (sectionAssignmentsResult.error) throw formatSupabaseError(sectionAssignmentsResult.error);
  if (subjectsResult.error) throw formatSupabaseError(subjectsResult.error);

  const teacherAssignments = teacherAssignmentsResult.data || [];
  const sectionAssignments = sectionAssignmentsResult.data || [];
  const subjects = subjectsResult.data || [];

  const teacherUserIds = teacherAssignments.map((row) => row.teacher_id).filter(Boolean);
  const buildingIds = sectionAssignments.map((row) => row.building_id).filter(Boolean);

  const [usersMap, buildingsMap] = await Promise.all([
    fetchUsersByIds(teacherUserIds),
    fetchBuildingsByIds(buildingIds),
  ]);

  const teacherAssignmentMap = new Map();
  teacherAssignments.forEach((row) => teacherAssignmentMap.set(row.id, row));

  const sectionAssignmentBySection = new Map();
  sectionAssignments.forEach((row) => {
    if (!sectionAssignmentBySection.has(row.section_id)) {
      sectionAssignmentBySection.set(row.section_id, row);
    }
  });

  const subjectByCode = new Map();
  subjects.forEach((row) => subjectByCode.set(row.subject_code, mapSubject(row)));

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const mapped = rows.map((row) => {
    const section = sectionsMap.get(row.section_id);
    const assignment = teacherAssignmentMap.get(row.teacher_assignment_id);
    const teacher = assignment ? usersMap.get(assignment.teacher_id) : null;
    const roomAssignment = sectionAssignmentBySection.get(row.section_id);
    const building = roomAssignment ? buildingsMap.get(roomAssignment.building_id) : null;
    const subject = subjectByCode.get(row.subject_code);

    const startHour = parseInt(String(row.time_start || "0").split(":")[0], 10);
    const classType =
      row.class_type || (!Number.isNaN(startHour) && startHour >= 18 ? "night" : "day");

    return {
      id: row.id,
      day: row.day_of_week || row.day || "Monday",
      time_start: row.time_start,
      time_end: row.time_end,
      subject: row.subject_code || subject?.subject_code || "",
      subject_title: subject?.subject_name || "",
      instructor: teacher?.full_name || teacher?.username || null,
      year: section?.grade_level || "",
      section: section?.section_name || "",
      building: building?.name || null,
      floor: roomAssignment?.floor_number ?? null,
      room: roomAssignment?.room_number ?? null,
      class_type: classType,
    };
  });

  mapped.sort((a, b) => {
    const dayA = dayOrder.indexOf(a.day);
    const dayB = dayOrder.indexOf(b.day);
    if (dayA !== dayB) return dayA - dayB;
    return String(a.time_start || "").localeCompare(String(b.time_start || ""));
  });

  return mapped;
};

const mapUserAssignmentRows = async (rows) => {
  const assignments = rows || [];
  if (!assignments.length) return [];

  const userIds = assignments.map((row) => row.user_id).filter(Boolean);
  const sectionIds = assignments.map((row) => row.section_id).filter(Boolean);
  const [usersMap, sectionsMap] = await Promise.all([
    fetchUsersByIds(userIds),
    fetchSectionsByIds(sectionIds),
  ]);

  return assignments.map((row) => {
    const user = usersMap.get(row.user_id);
    const section = sectionsMap.get(row.section_id);
    const year = normalizeYearLevel(row.year_level || section?.grade_level);
    const sanctions = row.sanctions === true || Number(row.sanctions) > 0;
    return {
      ...row,
      user_id: row.user_id,
      id: row.id,
      username: user?.username || "",
      full_name: user?.full_name || user?.username || "",
      email: user?.email || "",
      school_id: user?.school_id || "",
      image_path: user?.image_path || DEFAULT_AVATAR,
      year,
      year_level: year,
      grade_level: year,
      section: row.section || section?.section_name || "",
      section_name: section?.section_name || row.section || "",
      department: row.department || section?.course || "",
      major: row.major || section?.major || "",
      payment: row.payment || "paid",
      amount_lacking: parseNumber(row.amount_lacking, null),
      sanctions,
      sanction_reason: row.sanction_reason || "",
      semester: row.semester || "1st Semester",
      student_status: row.student_status || "Regular",
    };
  });
};

const ensureBuilding = async (buildingName) => {
  const normalized = String(buildingName || "").trim();
  if (!normalized) return null;

  const { data: existing, error: existingError } = await supabase
    .from("buildings")
    .select("*")
    .ilike("building_name", normalized)
    .limit(1)
    .maybeSingle();
  if (existingError) throw formatSupabaseError(existingError);
  if (existing) return mapBuilding(existing);

  const { data: inserted, error: insertError } = await supabase
    .from("buildings")
    .insert({
      building_name: normalized,
      num_floors: 4,
      rooms_per_floor: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (insertError) throw formatSupabaseError(insertError);
  return mapBuilding(inserted);
};

const ensureStudyLoad = async ({
  section,
  subject,
  teacherName = null,
  failIfExists = false,
}) => {
  const { data: existing, error: existingError } = await supabase
    .from("study_load")
    .select("*")
    .eq("section_id", section.id)
    .eq("subject_id", subject.id)
    .limit(1);

  if (existingError) throw formatSupabaseError(existingError);
  if ((existing || []).length > 0) {
    if (failIfExists) {
      const duplicateError = new Error("Subject already assigned to this section.");
      duplicateError.status = 409;
      throw duplicateError;
    }
    return existing[0];
  }

  const { data, error } = await supabase
    .from("study_load")
    .insert({
      student_id: null,
      subject_id: subject.id,
      section_id: section.id,
      school_year: section.school_year || currentSchoolYear(),
      semester: subject.semester || "1st Semester",
      enrollment_status: "enrolled",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      course: section.course || subject.course || null,
      major: section.major || subject.major || null,
      year_level: normalizeYearLevel(section.grade_level || subject.year_level),
      section: section.section_name,
      subject_code: subject.subject_code,
      subject_title: subject.subject_name,
      units: subject.units || 0,
      teacher: teacherName,
    })
    .select("*")
    .single();

  if (error) throw formatSupabaseError(error);
  return data;
};

const countExact = async (table) => {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw formatSupabaseError(error);
  return count || 0;
};

export const AdminAPI = {
  getUsers: async (filters = {}) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw formatSupabaseError(error);

      const mapped = (data || []).map(normalizeUser);
      if (!filters?.role) return mapped;
      const role = normalizeRole(filters.role);
      return mapped.filter((user) => user.roles.includes(role));
    }),

  updateUserRoles: async (userId, roles) =>
    withApi(async () => {
      const normalized = normalizeRoles(roles, "student");
      await safeUserUpdate(userId, {
        role: normalized[0],
        roles: normalized,
        updated_at: new Date().toISOString(),
      });
      return { success: true };
    }),

  updateUserSubRole: async (userId, primarySubRole, subRoles = []) =>
    withApi(async () => {
      const normalized = normalizeSubRoles(subRoles, primarySubRole);
      await safeUserUpdate(userId, {
        sub_role: normalized[0] || null,
        sub_roles: normalized,
        updated_at: new Date().toISOString(),
      });
      return { success: true };
    }),

  deleteUser: async (userId) =>
    withApi(async () => {
      await Promise.all([
        supabase.from("user_assignments").delete().eq("user_id", userId),
        supabase.from("teacher_assignments").delete().eq("teacher_id", userId),
        supabase.from("grades").delete().eq("student_id", userId),
        supabase.from("grades").delete().eq("teacher_id", userId),
        supabase.from("teacher_evaluations").delete().eq("student_id", userId),
        supabase.from("teacher_evaluations").delete().eq("teacher_id", userId),
        supabase.from("announcements").delete().eq("author_id", userId),
        supabase.from("feedbacks").delete().eq("student_id", userId),
        supabase.from("feedbacks").update({ replied_by: null }).eq("replied_by", userId),
      ]);

      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getDashboardStats: async () =>
    withApi(async () => {
      const [
        usersCount,
        subjectsCount,
        sectionsCount,
        schedulesCount,
        announcementsCount,
        studyLoadCount,
        usersResult,
        buildingsResult,
        announcementsResult,
      ] = await Promise.all([
        countExact("users"),
        countExact("subjects"),
        countExact("sections"),
        countExact("schedules"),
        countExact("announcements"),
        countExact("study_load"),
        supabase.from("users").select("*"),
        supabase.from("buildings").select("*"),
        supabase
          .from("announcements")
          .select("*")
          .order("published_at", { ascending: false })
          .limit(5),
      ]);

      if (usersResult.error) throw formatSupabaseError(usersResult.error);
      if (buildingsResult.error) throw formatSupabaseError(buildingsResult.error);
      if (announcementsResult.error) throw formatSupabaseError(announcementsResult.error);

      const normalizedUsers = (usersResult.data || []).map(normalizeUser);
      const students = normalizedUsers.filter((user) => user.roles.includes("student")).length;
      const teachers = normalizedUsers.filter((user) => user.roles.includes("teacher")).length;
      const admins = normalizedUsers.filter((user) => user.roles.includes("admin")).length;
      const nonTeaching = normalizedUsers.filter((user) => user.roles.includes("nt")).length;

      return {
        users: usersCount,
        subjects: subjectsCount,
        sections: sectionsCount,
        schedules: schedulesCount,
        announcements: announcementsCount,
        study_load: studyLoadCount,
        students,
        teachers,
        admins,
        non_teaching: nonTeaching,
        buildings: (buildingsResult.data || []).map(mapBuilding),
        recent_announcements: (announcementsResult.data || []).map(mapAnnouncement),
      };
    }),

  getAnnouncements: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("published_at", { ascending: false });
      if (error) throw formatSupabaseError(error);
      return (data || []).map(mapAnnouncement);
    }),

  createAnnouncement: async (payload) =>
    withApi(async () => {
      const currentUser = readStoredUser();
      const insertPayload = {
        title: payload?.title || "",
        content: payload?.content || "",
        year: payload?.year || null,
        department: payload?.department || null,
        major: payload?.major || null,
        author_id: currentUser?.id || 1,
        target_role: payload?.target_role || "all",
        priority: payload?.priority || "medium",
        is_published: payload?.is_published == null ? 1 : payload.is_published,
        published_at: payload?.published_at || new Date().toISOString(),
        expires_at: payload?.expires_at || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("announcements")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapAnnouncement(data);
    }),

  updateAnnouncement: async (id, payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("announcements")
        .update({
          title: payload?.title,
          content: payload?.content,
          year: payload?.year || null,
          department: payload?.department || null,
          major: payload?.major || null,
          target_role: payload?.target_role,
          priority: payload?.priority,
          expires_at: payload?.expires_at || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapAnnouncement(data);
    }),

  deleteAnnouncement: async (id) =>
    withApi(async () => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getEvaluationSettings: async () =>
    withApi(async () => {
      const { data, error } = await supabase.from("evaluation_settings").select("*");
      if (error) throw formatSupabaseError(error);

      const byKey = new Map();
      (data || []).forEach((row) => byKey.set(row.setting_key, row.setting_value));

      let template = null;
      const rawTemplate = byKey.get("template");
      if (rawTemplate) {
        try {
          template = typeof rawTemplate === "string" ? JSON.parse(rawTemplate) : rawTemplate;
        } catch (_) {
          template = null;
        }
      }

      return {
        enabled: toBoolean(
          byKey.get("enabled") ?? byKey.get("evaluation_enabled"),
          true,
        ),
        template,
      };
    }),

  updateEvaluationSettings: async (settings) =>
    withApi(async () => {
      if (settings?.enabled !== undefined) {
        const enabled = settings.enabled ? "true" : "false";
        await upsertSetting("enabled", enabled, "Enable/disable teacher evaluation system");
        await upsertSetting("evaluation_enabled", enabled, "Enable/disable teacher evaluation system");
      }

      if (settings?.template !== undefined) {
        await upsertSetting("template", JSON.stringify(settings.template), "Evaluation template");
      }

      return { success: true };
    }),

  getLowestRatedTeachers: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("teacher_evaluations")
        .select("teacher_id,rating_overall,created_at");
      if (error) throw formatSupabaseError(error);

      const groups = new Map();
      (data || []).forEach((row) => {
        if (!row.teacher_id) return;
        if (!groups.has(row.teacher_id)) {
          groups.set(row.teacher_id, { total: 0, count: 0 });
        }
        const group = groups.get(row.teacher_id);
        const rating = parseNumber(row.rating_overall, null);
        if (rating != null) {
          group.total += rating;
          group.count += 1;
        }
      });

      const teacherIds = Array.from(groups.keys());
      const usersMap = await fetchUsersByIds(teacherIds);

      const teachers = teacherIds
        .map((teacherId) => {
          const totals = groups.get(teacherId);
          const average = totals.count ? totals.total / totals.count : 0;
          const user = usersMap.get(teacherId);
          return {
            id: teacherId,
            full_name: user?.full_name || user?.username || `Teacher ${teacherId}`,
            image_path: user?.image_path || DEFAULT_AVATAR,
            average_rating: Number(average.toFixed(2)),
            total_evaluations: totals.count,
            percentage: Number(((average / 4) * 100).toFixed(1)),
          };
        })
        .sort((a, b) => a.average_rating - b.average_rating);

      return { teachers };
    }),

  getBuildings: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .order("building_name", { ascending: true });
      if (error) throw formatSupabaseError(error);
      return (data || []).map(mapBuilding);
    }),

  createBuilding: async (payload) =>
    withApi(async () => {
      const name = payload?.building_name || payload?.name;
      if (!name) throw new Error("Building name is required.");

      const { data, error } = await supabase
        .from("buildings")
        .insert({
          building_name: String(name).trim(),
          num_floors: parseNumber(payload?.num_floors ?? payload?.floors, 1),
          rooms_per_floor: parseNumber(payload?.rooms_per_floor, 10),
          description: payload?.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapBuilding(data);
    }),

  deleteBuilding: async (identifier) =>
    withApi(async () => {
      let query = supabase.from("buildings").select("*");
      if (Number.isFinite(Number(identifier))) {
        query = query.eq("id", Number(identifier));
      } else {
        query = query.ilike("building_name", String(identifier));
      }

      const { data, error } = await query;
      if (error) throw formatSupabaseError(error);
      const buildings = (data || []).map(mapBuilding);
      if (!buildings.length) return { success: true };

      await Promise.all(
        buildings.map((building) =>
          supabase.from("section_assignments").delete().eq("building_id", building.id),
        ),
      );
      await Promise.all(
        buildings.map((building) => supabase.from("buildings").delete().eq("id", building.id)),
      );
      return { success: true };
    }),

  getSections: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .order("grade_level", { ascending: true })
        .order("section_name", { ascending: true });
      if (error) throw formatSupabaseError(error);
      return (data || []).map(mapSection);
    }),

  createSection: async (payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("sections")
        .insert({
          section_name: payload?.section_name,
          grade_level: normalizeYearLevel(payload?.grade_level),
          school_year: payload?.school_year || currentSchoolYear(),
          course: payload?.course || null,
          major: payload?.major || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapSection(data);
    }),

  updateSection: async (id, payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("sections")
        .update({
          section_name: payload?.section_name,
          grade_level: normalizeYearLevel(payload?.grade_level),
          school_year: payload?.school_year || currentSchoolYear(),
          course: payload?.course || null,
          major: payload?.major || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapSection(data);
    }),

  deleteSection: async (id) =>
    withApi(async () => {
      await Promise.all([
        supabase.from("user_assignments").delete().eq("section_id", id),
        supabase.from("teacher_assignments").delete().eq("section_id", id),
        supabase.from("section_assignments").delete().eq("section_id", id),
        supabase.from("schedules").delete().eq("section_id", id),
        supabase.from("study_load").delete().eq("section_id", id),
        supabase.from("grades").delete().eq("section_id", id),
      ]);
      const { error } = await supabase.from("sections").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getSectionAssignments: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("section_assignments")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw formatSupabaseError(error);

      const rows = data || [];
      const sectionIds = rows.map((row) => row.section_id).filter(Boolean);
      const buildingIds = rows.map((row) => row.building_id).filter(Boolean);
      const [sectionsMap, buildingsMap] = await Promise.all([
        fetchSectionsByIds(sectionIds),
        fetchBuildingsByIds(buildingIds),
      ]);

      return rows.map((row) => {
        const section = sectionsMap.get(row.section_id);
        const building = buildingsMap.get(row.building_id);
        return {
          ...row,
          year: normalizeYearLevel(section?.grade_level),
          section: section?.section_name || "",
          building: building?.name || "",
          floor: parseNumber(row.floor_number, null),
          room: parseNumber(row.room_number, null),
        };
      });
    }),

  createSectionAssignment: async (payload) =>
    withApi(async () => {
      const section = await findSection({
        sectionId: payload?.section_id,
        sectionName: payload?.section,
        year: payload?.year,
      });
      if (!section) throw new Error("Section not found.");

      const building = await ensureBuilding(payload?.building);
      if (!building) throw new Error("Building is required.");

      const { data: existing, error: existingError } = await supabase
        .from("section_assignments")
        .select("*")
        .eq("section_id", section.id)
        .limit(1)
        .maybeSingle();
      if (existingError) throw formatSupabaseError(existingError);

      const assignmentPayload = {
        section_id: section.id,
        building_id: building.id,
        floor_number: parseNumber(payload?.floor, 1),
        room_number: parseNumber(payload?.room, null),
        school_year: section.school_year || currentSchoolYear(),
        status: "active",
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { data, error } = await supabase
          .from("section_assignments")
          .update(assignmentPayload)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw formatSupabaseError(error);
        return data;
      }

      const { data, error } = await supabase
        .from("section_assignments")
        .insert({ ...assignmentPayload, created_at: new Date().toISOString() })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  updateSectionAssignment: async (id, payload) =>
    withApi(async () => {
      let buildingId = payload?.building_id || null;
      if (!buildingId && payload?.building) {
        const building = await ensureBuilding(payload.building);
        buildingId = building?.id || null;
      }

      const { data, error } = await supabase
        .from("section_assignments")
        .update({
          building_id: buildingId,
          floor_number: parseNumber(payload?.floor, 1),
          room_number: parseNumber(payload?.room, null),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  deleteSectionAssignment: async (id) =>
    withApi(async () => {
      const { error } = await supabase
        .from("section_assignments")
        .delete()
        .eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getUserAssignments: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("user_assignments")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw formatSupabaseError(error);
      return mapUserAssignmentRows(data || []);
    }),

  createUserAssignment: async (payload) =>
    withApi(async () => {
      let userId = payload?.user_id || payload?.existing_user_id || null;
      if (!userId && payload?.full_name) {
        const q = sanitizeLike(payload.full_name);
        if (q) {
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("*")
            .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
            .limit(1);
          if (usersError) throw formatSupabaseError(usersError);
          userId = users?.[0]?.id || null;
        }
      }
      if (!userId) throw new Error("User not found.");

      const section = await findSection({
        sectionId: payload?.section_id,
        sectionName: payload?.section,
        year: payload?.year,
      });
      if (!section) throw new Error("Section not found.");

      const insertPayload = {
        user_id: userId,
        section_id: section.id,
        assignment_type: "primary",
        status: "active",
        year_level: normalizeYearLevel(payload?.year || section.grade_level),
        section: section.section_name,
        department: payload?.department || section.course || null,
        major: payload?.major || section.major || null,
        payment: payload?.payment || "paid",
        amount_lacking:
          payload?.amount_lacking === "" || payload?.amount_lacking == null
            ? payload?.payment === "owing"
              ? 0
              : null
            : parseNumber(payload.amount_lacking, 0),
        sanctions: toBoolean(payload?.sanctions, false),
        sanction_reason: payload?.sanction_reason || null,
        semester: payload?.semester || "1st Semester",
        student_status: payload?.student_status || "Regular",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("user_assignments")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      const mapped = await mapUserAssignmentRows([data]);
      return mapped[0] || data;
    }),

  updateUserAssignment: async (id, payload) =>
    withApi(async () => {
      const updates = {
        updated_at: new Date().toISOString(),
      };

      if (payload?.year !== undefined) {
        updates.year_level = normalizeYearLevel(payload.year);
      }

      if (payload?.section !== undefined || payload?.section_id !== undefined) {
        const section = await findSection({
          sectionId: payload?.section_id,
          sectionName: payload?.section,
          year: payload?.year,
        });
        if (section) {
          updates.section_id = section.id;
          updates.section = section.section_name;
        } else if (payload?.section === null || payload?.section === "") {
          updates.section_id = null;
          updates.section = null;
        }
      }

      if (payload?.department !== undefined) updates.department = payload.department || null;
      if (payload?.major !== undefined) updates.major = payload.major || null;
      if (payload?.payment !== undefined) updates.payment = payload.payment || "paid";
      if (payload?.amount_lacking !== undefined) {
        updates.amount_lacking =
          payload.amount_lacking === "" || payload.amount_lacking == null
            ? null
            : parseNumber(payload.amount_lacking, 0);
      } else if (payload?.payment === "paid") {
        updates.amount_lacking = 0;
      }
      if (payload?.sanctions !== undefined) updates.sanctions = toBoolean(payload.sanctions, false);
      if (payload?.sanction_reason !== undefined) {
        updates.sanction_reason = payload.sanction_reason || null;
      }
      if (payload?.semester !== undefined) updates.semester = payload.semester || "1st Semester";
      if (payload?.student_status !== undefined) {
        updates.student_status = payload.student_status || "Regular";
      }

      const { data, error } = await supabase
        .from("user_assignments")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      const mapped = await mapUserAssignmentRows([data]);
      return mapped[0] || data;
    }),

  deleteUserAssignment: async (id) =>
    withApi(async () => {
      const { error } = await supabase
        .from("user_assignments")
        .delete()
        .eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getUserSuggestions: async (query, role = null) =>
    withApi(async () => {
      const safe = sanitizeLike(query);
      if (!safe || safe.length < 2) return [];

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`)
        .limit(10);
      if (error) throw formatSupabaseError(error);

      const mapped = (data || []).map(normalizeUser);
      if (!role) return mapped;
      const targetRole = normalizeRole(role);
      return mapped.filter((user) => user.roles.includes(targetRole));
    }),

  getSubjects: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("course", { ascending: true })
        .order("year_level", { ascending: true })
        .order("subject_code", { ascending: true });
      if (error) throw formatSupabaseError(error);
      return (data || []).map(mapSubject);
    }),

  createSubject: async (payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("subjects")
        .insert({
          subject_code: String(payload?.subject_code || "").trim(),
          subject_name: String(payload?.subject_name || payload?.title || "").trim(),
          title: payload?.title || payload?.subject_name || null,
          description: payload?.description || null,
          units: parseNumber(payload?.units, 0),
          course: payload?.course || null,
          major: payload?.major || null,
          year_level: parseNumber(payload?.year_level, null),
          semester: payload?.semester || "First Semester",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapSubject(data);
    }),

  updateSubject: async (id, payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("subjects")
        .update({
          subject_code: String(payload?.subject_code || "").trim(),
          subject_name: String(payload?.subject_name || payload?.title || "").trim(),
          title: payload?.title || payload?.subject_name || null,
          description: payload?.description || null,
          units: parseNumber(payload?.units, 0),
          course: payload?.course || null,
          major: payload?.major || null,
          year_level: parseNumber(payload?.year_level, null),
          semester: payload?.semester || "First Semester",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapSubject(data);
    }),

  deleteSubject: async (id) =>
    withApi(async () => {
      const { data: subjectRow, error: subjectError } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", id)
        .limit(1)
        .maybeSingle();
      if (subjectError) throw formatSupabaseError(subjectError);
      if (!subjectRow) return { success: true };

      await Promise.all([
        supabase.from("teacher_assignments").delete().eq("subject_id", id),
        supabase.from("grades").delete().eq("subject_id", id),
        supabase.from("study_load").delete().eq("subject_id", id),
        supabase.from("study_load").delete().eq("subject_code", subjectRow.subject_code),
        supabase.from("section_assignments").delete().eq("subject_id", id),
        supabase.from("schedules").delete().eq("subject_code", subjectRow.subject_code),
      ]);

      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getTeacherAssignments: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw formatSupabaseError(error);

      const rows = data || [];
      const teacherIds = rows.map((row) => row.teacher_id).filter(Boolean);
      const subjectIds = rows.map((row) => row.subject_id).filter(Boolean);
      const sectionIds = rows.map((row) => row.section_id).filter(Boolean);

      const [usersMap, subjectsMap, sectionsMap] = await Promise.all([
        fetchUsersByIds(teacherIds),
        fetchSubjectsByIds(subjectIds),
        fetchSectionsByIds(sectionIds),
      ]);

      return rows.map((row) => {
        const teacher = usersMap.get(row.teacher_id);
        const subject = subjectsMap.get(row.subject_id);
        const section = sectionsMap.get(row.section_id);
        return {
          id: row.id,
          teacher_id: row.teacher_id,
          subject_id: row.subject_id,
          section_id: row.section_id,
          status: row.status,
          created_at: row.created_at,
          full_name: teacher?.full_name || "",
          username: teacher?.username || "",
          subject_code: subject?.subject_code || row.subject_code || "",
          subject_title: subject?.subject_name || row.subject_title || "",
          section_name: section?.section_name || row.section || "",
          grade_level: section?.grade_level || "",
        };
      });
    }),

  createTeacherAssignment: async (payload) =>
    withApi(async () => {
      let teacherId = payload?.user_id || null;
      if (!teacherId && payload?.teacher_name) {
        const q = sanitizeLike(payload.teacher_name);
        const { data: teachers, error: teacherError } = await supabase
          .from("users")
          .select("*")
          .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
          .limit(25);
        if (teacherError) throw formatSupabaseError(teacherError);
        const match = (teachers || [])
          .map(normalizeUser)
          .find((user) => user.roles.includes("teacher"));
        teacherId = match?.id || null;
      }
      if (!teacherId) throw new Error("Teacher not found.");

      const subject = await findSubjectByCode(payload?.subject_code);
      if (!subject) throw new Error("Subject not found.");

      const section = await findSection({
        sectionId: payload?.section_id,
        sectionName: payload?.section,
        year: payload?.year,
      });

      const { data: existing, error: existingError } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("subject_id", subject.id)
        .eq("status", "active")
        .limit(1);
      if (existingError) throw formatSupabaseError(existingError);
      if ((existing || []).length > 0) {
        const duplicateError = new Error("Assignment already exists.");
        duplicateError.status = 409;
        throw duplicateError;
      }

      const { data, error } = await supabase
        .from("teacher_assignments")
        .insert({
          teacher_id: teacherId,
          subject_id: subject.id,
          section_id: section?.id || null,
          section: section?.section_name || null,
          school_year: section?.school_year || currentSchoolYear(),
          semester: subject?.semester || "1st Semester",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  deleteTeacherAssignment: async (id) =>
    withApi(async () => {
      await supabase
        .from("schedules")
        .delete()
        .eq("teacher_assignment_id", id);
      const { error } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getSchedules: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("time_start", { ascending: true });
      if (error) throw formatSupabaseError(error);
      return mapScheduleRows(data || []);
    }),

  createSchedule: async (payload) =>
    withApi(async () => {
      const subject = await findSubjectByCode(payload?.subject);
      if (!subject) throw new Error("Subject not found.");

      const section = await findSection({
        sectionId: payload?.section_id,
        sectionName: payload?.section,
        year: payload?.year,
      });
      if (!section) throw new Error("Section not found.");

      const schoolYear = section.school_year || currentSchoolYear();
      const timeStart = String(payload?.time_start || "").trim();
      const timeEnd = String(payload?.time_end || "").trim();
      const isPlaceholderTime =
        ["00:00", "00:00:00"].includes(timeStart || "00:00") &&
        ["00:00", "00:00:00"].includes(timeEnd || "00:00");

      const { data: directAssignment, error: directAssignmentError } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("subject_id", subject.id)
        .eq("section_id", section.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (directAssignmentError) throw formatSupabaseError(directAssignmentError);

      let teacherAssignment = directAssignment;
      if (!teacherAssignment) {
        const { data: fallbackAssignment, error: fallbackAssignmentError } = await supabase
          .from("teacher_assignments")
          .select("*")
          .eq("subject_id", subject.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (fallbackAssignmentError) throw formatSupabaseError(fallbackAssignmentError);
        teacherAssignment = fallbackAssignment || null;
      }

      let teacherName = null;
      if (teacherAssignment?.teacher_id) {
        const usersMap = await fetchUsersByIds([teacherAssignment.teacher_id]);
        const teacher = usersMap.get(teacherAssignment.teacher_id);
        teacherName = teacher?.full_name || teacher?.username || null;
      }

      const upsertRoomAssignment = async () => {
        const buildingName = String(payload?.building || "").trim();
        const roomInput = String(payload?.room || "").trim();
        if (!buildingName || !roomInput || roomInput.toLowerCase() === "tba") return null;

        const roomNumber = parseNumber(roomInput, null);
        if (roomNumber == null) {
          if (isPlaceholderTime) return null;
          throw new Error("Room must be numeric.");
        }
        const floorNumber = parseNumber(payload?.floor, Math.floor(roomNumber / 100) || 1);

        const building = await ensureBuilding(buildingName);
        if (!building?.id) throw new Error("Building not found.");

        const { data: conflicts, error: conflictError } = await supabase
          .from("section_assignments")
          .select("id,section_id")
          .eq("building_id", building.id)
          .eq("floor_number", floorNumber)
          .eq("room_number", roomNumber)
          .eq("school_year", schoolYear)
          .neq("section_id", section.id);
        if (conflictError) throw formatSupabaseError(conflictError);
        if ((conflicts || []).length > 0) {
          const roomConflict = new Error("Room already assigned for this school year.");
          roomConflict.status = 409;
          throw roomConflict;
        }

        const { data: existing, error: existingError } = await supabase
          .from("section_assignments")
          .select("*")
          .eq("section_id", section.id)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingError) throw formatSupabaseError(existingError);

        const assignmentPayload = {
          section_id: section.id,
          building_id: building.id,
          floor_number: floorNumber,
          room_number: roomNumber,
          school_year: schoolYear,
          status: "active",
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          const { data: updated, error: updateError } = await supabase
            .from("section_assignments")
            .update(assignmentPayload)
            .eq("id", existing.id)
            .select("*")
            .single();
          if (updateError) throw formatSupabaseError(updateError);
          return updated.id;
        }

        const { data: inserted, error: insertError } = await supabase
          .from("section_assignments")
          .insert({
            ...assignmentPayload,
            created_at: new Date().toISOString(),
          })
          .select("*")
          .single();
        if (insertError) throw formatSupabaseError(insertError);
        return inserted.id;
      };

      if (isPlaceholderTime) {
        await upsertRoomAssignment();
        await ensureStudyLoad({
          section,
          subject,
          teacherName,
          failIfExists: true,
        });
        return { success: true };
      }

      if (!teacherAssignment) {
        throw new Error("No teacher assigned to this subject.");
      }

      const toMinutes = (value) => {
        const raw = String(value || "").trim();
        if (!raw) return null;
        const [hours, minutes] = raw.split(":").map((part) => parseInt(part, 10));
        if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
        return hours * 60 + minutes;
      };

      const startMinutes = toMinutes(timeStart);
      const endMinutes = toMinutes(timeEnd);
      if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
        throw new Error("Invalid schedule time range.");
      }

      const { data: teacherAssignments, error: teacherAssignmentsError } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", teacherAssignment.teacher_id)
        .eq("status", "active");
      if (teacherAssignmentsError) throw formatSupabaseError(teacherAssignmentsError);
      const teacherAssignmentIds = (teacherAssignments || []).map((row) => row.id);

      if (teacherAssignmentIds.length > 0) {
        const { data: daySchedules, error: daySchedulesError } = await supabase
          .from("schedules")
          .select("*")
          .eq("day_of_week", payload?.day)
          .in("teacher_assignment_id", teacherAssignmentIds);
        if (daySchedulesError) throw formatSupabaseError(daySchedulesError);

        const conflict = (daySchedules || []).find((row) => {
          const rowStart = toMinutes(row.time_start);
          const rowEnd = toMinutes(row.time_end);
          if (rowStart == null || rowEnd == null) return false;
          return startMinutes < rowEnd && endMinutes > rowStart;
        });

        if (conflict) {
          const scheduleConflict = new Error("Teacher conflict detected.");
          scheduleConflict.status = 409;
          throw scheduleConflict;
        }
      }

      const roomAssignmentId = await upsertRoomAssignment();
      const { data, error } = await supabase
        .from("schedules")
        .insert({
          teacher_assignment_id: teacherAssignment.id,
          day_of_week: payload?.day || "Monday",
          time_start: timeStart,
          time_end: timeEnd,
          room_id: roomAssignmentId,
          subject_code: subject.subject_code,
          section_id: section.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);

      await ensureStudyLoad({
        section,
        subject,
        teacherName,
      });

      return data;
    }),

  deleteSchedule: async (id) =>
    withApi(async () => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getProjects: async () =>
    withApi(async () => {
      const { data: campusProjects, error: campusError } = await supabase
        .from("campus_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (!campusError) {
        return (campusProjects || []).map(mapProject);
      }

      if (!isMissingRelation(campusError)) {
        throw formatSupabaseError(campusError);
      }

      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (projectsError) throw formatSupabaseError(projectsError);
      return (projects || []).map(mapProject);
    }),

  createProject: async (payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("campus_projects")
        .insert({
          name: payload?.name || payload?.title || "",
          status: payload?.status || "Ongoing",
          budget: payload?.budget || null,
          start_date: payload?.started || payload?.start_date || null,
          description: payload?.description || null,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapProject(data);
    }),

  updateProject: async (id, payload) =>
    withApi(async () => {
      const { data: campusUpdated, error: campusUpdateError } = await supabase
        .from("campus_projects")
        .update({
          name: payload?.name || payload?.title || "",
          status: payload?.status || "Ongoing",
          budget: payload?.budget || null,
          start_date: payload?.started || payload?.start_date || null,
          description: payload?.description || null,
        })
        .eq("id", id)
        .select("*");

      if (!campusUpdateError && (campusUpdated || []).length > 0) {
        return mapProject(campusUpdated[0]);
      }

      if (campusUpdateError && !isMissingRelation(campusUpdateError)) {
        throw formatSupabaseError(campusUpdateError);
      }

      const { data: projectUpdated, error: projectUpdateError } = await supabase
        .from("projects")
        .update({
          title: payload?.title || payload?.name || "",
          name: payload?.name || payload?.title || "",
          description: payload?.description || null,
          due_date: payload?.due_date || null,
          max_score: parseNumber(payload?.max_score, 100),
          status: payload?.status || "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*");

      if (projectUpdateError) throw formatSupabaseError(projectUpdateError);
      if ((projectUpdated || []).length === 0) {
        throw new Error("Project not found.");
      }
      return mapProject(projectUpdated[0]);
    }),

  deleteProject: async (id) =>
    withApi(async () => {
      const { error: campusDeleteError } = await supabase
        .from("campus_projects")
        .delete()
        .eq("id", id);
      if (campusDeleteError && !isMissingRelation(campusDeleteError)) {
        throw formatSupabaseError(campusDeleteError);
      }

      await supabase.from("projects").delete().eq("id", id);
      return { success: true };
    }),

  getSectionsWithLoad: async () =>
    withApi(async () => {
      const [sectionsResult, loadResult] = await Promise.all([
        supabase.from("sections").select("*"),
        supabase.from("study_load").select("section_id"),
      ]);

      if (sectionsResult.error) throw formatSupabaseError(sectionsResult.error);
      if (loadResult.error && !isMissingRelation(loadResult.error)) {
        throw formatSupabaseError(loadResult.error);
      }

      const counts = new Map();
      (loadResult.data || []).forEach((row) => {
        const key = row.section_id;
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      return (sectionsResult.data || []).map((row) => {
        const count = counts.get(row.id) || 0;
        return {
          ...mapSection(row),
          subject_count: count,
          load_count: count,
          status: count > 0 ? "Assigned" : "Not Assigned",
        };
      });
    }),

  getSectionLoadDetails: async (id) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("study_load")
        .select("*")
        .eq("section_id", id)
        .order("subject_code", { ascending: true });
      if (error) throw formatSupabaseError(error);

      return (data || []).map((row) => ({
        ...row,
        semester:
          normalizeSemester(row.semester) === "2nd Semester"
            ? "Second Semester"
            : normalizeSemester(row.semester) === "1st Semester"
              ? "First Semester"
              : normalizeSemester(row.semester),
      }));
    }),

  clearSectionLoad: async (sectionId) =>
    withApi(async () => {
      const { error } = await supabase
        .from("study_load")
        .delete()
        .eq("section_id", sectionId);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  deleteStudyLoad: async (id) =>
    withApi(async () => {
      const { error } = await supabase
        .from("study_load")
        .delete()
        .eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getGrades: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw formatSupabaseError(error);

      const rows = data || [];
      const studentIds = rows.map((row) => row.student_id).filter(Boolean);
      const teacherIds = rows.map((row) => row.teacher_id).filter(Boolean);
      const sectionIds = rows.map((row) => row.section_id).filter(Boolean);
      const subjectIds = rows.map((row) => row.subject_id).filter(Boolean);

      const [studentsMap, teachersMap, sectionsMap, subjectsMap] = await Promise.all([
        fetchUsersByIds(studentIds),
        fetchUsersByIds(teacherIds),
        fetchSectionsByIds(sectionIds),
        fetchSubjectsByIds(subjectIds),
      ]);

      return rows.map((row) => {
        const student = studentsMap.get(row.student_id);
        const teacher = teachersMap.get(row.teacher_id);
        const section = sectionsMap.get(row.section_id);
        const subject = subjectsMap.get(row.subject_id);

        return {
          id: row.id,
          user_id: row.student_id,
          username: student?.username || null,
          student_name: student?.full_name || student?.username || null,
          subject_id: row.subject_id,
          subject_code: subject?.subject_code || row.subject_code || null,
          subject_name: subject?.subject_name || row.subject_name || null,
          teacher_id: row.teacher_id,
          teacher_name: teacher?.full_name || teacher?.username || null,
          section_id: row.section_id,
          section_name: section?.section_name || null,
          year: section?.grade_level || null,
          school_year: row.school_year || null,
          semester:
            normalizeSemester(row.semester) === "2nd Semester"
              ? "Second Semester"
              : normalizeSemester(row.semester) === "1st Semester"
                ? "First Semester"
                : normalizeSemester(row.semester),
          prelim_grade: row.prelim_grade,
          midterm_grade: row.midterm_grade,
          finals_grade: row.finals_grade ?? row.final_grade,
          final_grade: row.final_grade,
          remarks: row.remarks,
        };
      });
    }),

  createGrade: async (payload) =>
    withApi(async () => {
      const studentId = parseNumber(payload?.student_id, null);
      if (!studentId) throw new Error("Student is required.");

      let subjectId = parseNumber(payload?.subject_id, null);
      if (!subjectId && payload?.subject_code) {
        const subject = await findSubjectByCode(payload.subject_code);
        subjectId = subject?.id || null;
      }
      if (!subjectId) throw new Error("Subject not found.");

      let sectionId = parseNumber(payload?.section_id, null);
      if (!sectionId) {
        const { data: assignment, error: assignmentError } = await supabase
          .from("user_assignments")
          .select("section_id,section")
          .eq("user_id", studentId)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (assignmentError && !isMissingRelation(assignmentError)) {
          throw formatSupabaseError(assignmentError);
        }
        if (assignment?.section_id) {
          sectionId = assignment.section_id;
        } else if (assignment?.section) {
          const section = await findSection({ sectionName: assignment.section });
          sectionId = section?.id || null;
        }
      }
      if (!sectionId) throw new Error("Could not determine student section.");

      const schoolYear = payload?.school_year || currentSchoolYear();
      const semester = normalizeSemester(payload?.semester || "1st Semester");

      const gradePayload = {
        student_id: studentId,
        subject_id: subjectId,
        teacher_id: parseNumber(payload?.teacher_id, null),
        section_id: sectionId,
        school_year: schoolYear,
        semester,
        prelim_grade: parseNumber(payload?.prelim_grade, null),
        midterm_grade: parseNumber(payload?.midterm_grade, null),
        finals_grade: parseNumber(payload?.finals_grade, null),
        final_grade: parseNumber(payload?.final_grade, null),
        remarks: payload?.remarks || null,
        updated_at: new Date().toISOString(),
      };

      const { data: existing, error: existingError } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", studentId)
        .eq("subject_id", subjectId)
        .eq("school_year", schoolYear)
        .eq("semester", semester)
        .limit(1)
        .maybeSingle();
      if (existingError) throw formatSupabaseError(existingError);

      if (existing) {
        const { data, error } = await supabase
          .from("grades")
          .update(gradePayload)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw formatSupabaseError(error);
        return data;
      }

      const { data, error } = await supabase
        .from("grades")
        .insert({
          ...gradePayload,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  updateGrade: async (id, payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("grades")
        .update({
          prelim_grade: payload?.prelim_grade ?? null,
          midterm_grade: payload?.midterm_grade ?? null,
          finals_grade: payload?.finals_grade ?? null,
          final_grade: payload?.final_grade ?? null,
          remarks: payload?.remarks ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  deleteGrade: async (id) =>
    withApi(async () => {
      const { error } = await supabase.from("grades").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  cleanupPictures: async () =>
    withApi(async () => {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, image_path");
      if (usersError) throw formatSupabaseError(usersError);

      const userRows = users || [];
      const existingUserIds = new Set(
        userRows
          .map((row) => String(row?.id || "").trim())
          .filter(Boolean),
      );

      const referencedPaths = new Set(
        userRows
          .map((row) => normalizeAvatarPathForUser(row?.id, row?.image_path))
          .filter(Boolean),
      );

      const storedFiles = await listStorageFilesRecursive(AVATAR_BUCKET, "profiles");
      const stalePaths = storedFiles
        .map((row) => String(row.full_path || "").replace(/^\/+/, ""))
        .filter((path) => {
          if (!path) return false;

          const ownerId = extractAvatarOwnerId(path);
          if (!ownerId) return true;
          if (!existingUserIds.has(ownerId)) return true;

          return !referencedPaths.has(path);
        });

      if (stalePaths.length > 0) {
        for (const batch of chunkArray(stalePaths, 100)) {
          const { error: removeError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .remove(batch);
          if (removeError) {
            throw formatSupabaseError(removeError, "Failed to remove unused profile images.");
          }
        }
      }

      return {
        deleted: stalePaths.length,
        total_users: userRows.length,
        scanned_files: storedFiles.length,
        active_files: referencedPaths.size,
        files: stalePaths,
      };
    }),

  createBackup: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const tables = [
        "users",
        "buildings",
        "rooms",
        "sections",
        "subjects",
        "announcements",
        "campus_projects",
        "evaluation_settings",
        "section_assignments",
        "teacher_assignments",
        "schedules",
        "user_assignments",
        "study_load",
        "grades",
        "teacher_evaluations",
        "feedbacks",
        "projects",
        "attendance_logs",
        "settings",
        "section_subjects",
      ];

      const records = {};
      const totals = {};

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) {
          if (isMissingRelation(error)) {
            records[table] = [];
            totals[table] = 0;
            continue;
          }
          throw formatSupabaseError(error, `Failed to read "${table}" for backup.`);
        }

        records[table] = data || [];
        totals[table] = (data || []).length;
      }

      const createdAt = new Date().toISOString();
      const payload = {
        created_at: createdAt,
        generated_by: {
          id: currentUser.id,
          username: currentUser.username || null,
          full_name: currentUser.full_name || null,
        },
        totals,
        records,
      };

      const serialized = JSON.stringify(payload, null, 2);
      const size = new TextEncoder().encode(serialized).length;
      const backupBlob = new Blob([serialized], { type: "application/json" });
      const stamp = createdAt.replace(/[:.]/g, "-");
      const filename = `backup_${stamp}.json`;
      const path = [BACKUP_PREFIX, filename].filter(Boolean).join("/");

      const { error: uploadError } = await supabase.storage
        .from(BACKUP_BUCKET)
        .upload(path, backupBlob, { contentType: "application/json", upsert: false });
      if (uploadError) {
        throw formatSupabaseError(uploadError, "Failed to upload backup to Supabase Storage.");
      }

      const { data: publicData } = supabase.storage.from(BACKUP_BUCKET).getPublicUrl(path);
      return {
        success: true,
        filename,
        size,
        created_at: createdAt,
        path,
        download_url: publicData?.publicUrl || null,
        totals,
      };
    }),

  getBackups: async () =>
    withApi(async () => {
      const files = await listStorageFilesRecursive(BACKUP_BUCKET, BACKUP_PREFIX);

      return files
        .filter((entry) => String(entry?.name || "").toLowerCase().endsWith(".json"))
        .map((entry) => {
          const path = entry.full_path;
          const { data: publicData } = supabase.storage.from(BACKUP_BUCKET).getPublicUrl(path);
          const createdAt = entry.created_at || entry.updated_at || null;
          return {
            filename: entry.name,
            path,
            size: parseNumber(entry?.metadata?.size, 0) || 0,
            created_at: createdAt,
            created: createdAt ? Math.floor(new Date(createdAt).getTime() / 1000) : null,
            download_url: publicData?.publicUrl || null,
          };
        })
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    }),

  getFeedbacks: async (status = "") =>
    withApi(async () => {
      let query = supabase
        .from("feedbacks")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) {
        if (isMissingRelation(error)) return [];
        throw formatSupabaseError(error);
      }

      const rows = data || [];
      const replierIds = rows.map((row) => row.replied_by).filter(Boolean);
      const repliers = await fetchUsersByIds(replierIds);

      return rows.map((row) => {
        const replier = row.replied_by ? repliers.get(row.replied_by) : null;
        return {
          id: row.id,
          message: row.message,
          category: row.category,
          status: row.status || "unread",
          reply: row.reply || null,
          replied_by_name: replier?.full_name || null,
          replied_by_role: replier?.role || null,
          replied_at: row.replied_at ? formatDateTime(row.replied_at) : null,
          created_at: row.created_at ? formatDateTime(row.created_at) : "",
        };
      });
    }),

  replyFeedback: async (id, replyText) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("feedbacks")
        .update({
          reply: String(replyText || "").trim(),
          replied_by: currentUser.id,
          replied_at: new Date().toISOString(),
          status: "replied",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  getFeedbackStats: async () =>
    withApi(async () => {
      const [unread, replied] = await Promise.all([
        supabase.from("feedbacks").select("*", { count: "exact", head: true }).eq("status", "unread"),
        supabase.from("feedbacks").select("*", { count: "exact", head: true }).eq("status", "replied"),
      ]);

      if (unread.error || replied.error) {
        if (isMissingRelation(unread.error) || isMissingRelation(replied.error)) {
          return { unread: 0, replied: 0, total: 0 };
        }
        throw formatSupabaseError(unread.error || replied.error);
      }

      const unreadCount = unread.count || 0;
      const repliedCount = replied.count || 0;
      return {
        unread: unreadCount,
        replied: repliedCount,
        total: unreadCount + repliedCount,
      };
    }),
};

const detectMissingColumn = (error) => {
  const message = String(error?.message || "");
  return (
    message.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i)?.[1] ||
    message.match(/could not find the ['"]([a-zA-Z0-9_]+)['"] column/i)?.[1] ||
    null
  );
};

const safeInsertWithFallback = async (table, payload, selectClause = "*") => {
  const mutable = { ...payload };

  while (Object.keys(mutable).length > 0) {
    const { data, error } = await supabase
      .from(table)
      .insert(mutable)
      .select(selectClause)
      .single();

    if (!error) return data;

    const missingColumn = detectMissingColumn(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(mutable, missingColumn)) {
      delete mutable[missingColumn];
      continue;
    }

    throw formatSupabaseError(error);
  }

  throw new Error(`No valid columns available for insert on ${table}.`);
};

const normalizeSemesterCode = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "1st";
  if (raw.includes("2") || raw.includes("second")) return "2nd";
  if (raw.includes("summer")) return "summer";
  return "1st";
};

const buildSemesterVariants = (value) => {
  const code = normalizeSemesterCode(value);
  if (code === "2nd") {
    return [
      "2nd",
      "2nd semester",
      "second semester",
      "second",
      "2nd_semester",
      "2nd-semester",
      "Second Semester",
      "2nd Semester",
    ];
  }
  if (code === "summer") {
    return ["summer", "Summer", "Summer Semester", "summer semester"];
  }
  return [
    "1st",
    "1st semester",
    "first semester",
    "first",
    "1st_semester",
    "1st-semester",
    "First Semester",
    "1st Semester",
  ];
};

const formatSemesterLabel = (value) => {
  const code = normalizeSemesterCode(value);
  if (code === "2nd") return "Second Semester";
  if (code === "summer") return "Summer";
  return "First Semester";
};

const getActiveAssignmentForUser = async (userId) => {
  const { data, error } = await supabase
    .from("user_assignments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) return null;
    throw formatSupabaseError(error);
  }

  return data || null;
};

const resolveSectionFromAssignment = async (assignment) => {
  if (!assignment) return null;
  return (
    (await findSection({
      sectionId: assignment.section_id,
      sectionName: assignment.section,
      year: assignment.year_level,
    })) || {
      id: assignment.section_id || null,
      section_name: assignment.section || "",
      grade_level: normalizeYearLevel(assignment.year_level),
      school_year: assignment.school_year || currentSchoolYear(),
      course: assignment.department || null,
      major: assignment.major || null,
    }
  );
};

const resolveSectionRoomDetails = async (sectionId) => {
  if (!sectionId) {
    return { building: null, room: null, floor: null };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("section_assignments")
    .select("*")
    .eq("section_id", sectionId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (assignmentError) {
    if (isMissingRelation(assignmentError)) {
      return { building: null, room: null, floor: null };
    }
    throw formatSupabaseError(assignmentError);
  }

  if (!assignment) return { building: null, room: null, floor: null };

  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("*")
    .eq("id", assignment.building_id)
    .limit(1)
    .maybeSingle();
  if (buildingError && !isMissingRelation(buildingError)) {
    throw formatSupabaseError(buildingError);
  }

  return {
    building: building?.building_name || null,
    room: assignment.room_number ?? null,
    floor: assignment.floor_number ?? null,
  };
};

const tryParseJson = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
};

export const StudentAPI = {
  getAssignment: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const assignment = await getActiveAssignmentForUser(currentUser.id);
      if (!assignment) return null;

      const section = await resolveSectionFromAssignment(assignment);
      const sectionId = section?.id || assignment.section_id || null;
      const sectionName = section?.section_name || assignment.section || "";
      const roomInfo = await resolveSectionRoomDetails(sectionId);

      const usersMap = await fetchUsersByIds([currentUser.id]);
      const user = usersMap.get(currentUser.id);
      const yearLevel = normalizeYearLevel(assignment.year_level || section?.grade_level);
      const department = assignment.department || section?.course || null;
      const major = assignment.major || section?.major || null;

      return {
        id: assignment.id,
        year: yearLevel,
        year_level: yearLevel,
        grade_level: yearLevel,
        section: sectionName,
        section_name: sectionName,
        section_id: sectionId,
        section_full_name: sectionName,
        section_code: sectionName,
        section_course: department,
        department,
        major,
        payment: assignment.payment || "paid",
        amount_lacking: assignment.amount_lacking,
        sanctions: assignment.sanctions,
        sanction_reason: assignment.sanction_reason || "",
        student_status: assignment.student_status || "Regular",
        semester: assignment.semester || "1st Semester",
        school_year: section?.school_year || assignment.school_year || currentSchoolYear(),
        gender: user?.gender || currentUser?.gender || null,
        building: roomInfo.building,
        floor: roomInfo.floor,
        room: roomInfo.room,
      };
    }),

  getStudyLoad: async (semester = "all") =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const assignment = await getActiveAssignmentForUser(currentUser.id);
      if (!assignment) return [];

      const section = await resolveSectionFromAssignment(assignment);
      if (!section?.id && !section?.section_name) return [];

      let query = supabase.from("study_load").select("*");
      if (section?.id) {
        query = query.eq("section_id", section.id);
      } else {
        query = query.eq("section", section.section_name);
      }

      const { data, error } = await query.order("subject_code", { ascending: true });
      if (error) throw formatSupabaseError(error);

      let rows = data || [];
      if (semester && String(semester).toLowerCase() !== "all") {
        const variants = buildSemesterVariants(semester).map((item) => item.toLowerCase());
        rows = rows.filter((row) => {
          const raw = String(row.semester || "").trim().toLowerCase();
          if (!raw) return true;
          return variants.includes(raw);
        });
      }

      return rows.map((row) => ({
        ...row,
        subject_code: row.subject_code || "",
        subject_title: row.subject_title || "",
        units: parseNumber(row.units, 0),
        semester: formatSemesterLabel(row.semester),
        teacher: row.teacher || "TBA",
      }));
    }),

  getGrades: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", currentUser.id)
        .order("updated_at", { ascending: false });
      if (error) throw formatSupabaseError(error);

      const rows = data || [];
      const subjectIds = rows.map((row) => row.subject_id).filter(Boolean);
      const sectionIds = rows.map((row) => row.section_id).filter(Boolean);
      const teacherIds = rows.map((row) => row.teacher_id).filter(Boolean);

      const [subjectsMap, sectionsMap, teachersMap] = await Promise.all([
        fetchSubjectsByIds(subjectIds),
        fetchSectionsByIds(sectionIds),
        fetchUsersByIds(teacherIds),
      ]);

      return rows.map((row) => {
        const subject = subjectsMap.get(row.subject_id);
        const section = sectionsMap.get(row.section_id);
        const teacher = teachersMap.get(row.teacher_id);
        return {
          id: row.id,
          subject_code: subject?.subject_code || row.subject_code || "",
          subject_name: subject?.subject_name || row.subject_name || "",
          subject: subject?.subject_name || row.subject_name || "",
          prelim_grade: row.prelim_grade,
          midterm_grade: row.midterm_grade,
          finals_grade: row.finals_grade ?? row.final_grade,
          final_grade: row.final_grade,
          remarks: row.remarks,
          semester: formatSemesterLabel(row.semester),
          school_year: row.school_year,
          year: normalizeYearLevel(section?.grade_level),
          instructor: teacher?.full_name || teacher?.username || null,
        };
      });
    }),

  getAnnouncements: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const assignment = await getActiveAssignmentForUser(currentUser.id);

      const { data, error } = await supabase.from("announcements").select("*");
      if (error) throw formatSupabaseError(error);

      const department = String(assignment?.department || "").trim();
      const yearLevel = normalizeYearLevel(assignment?.year_level || "");
      const now = new Date();
      const priorityOrder = { high: 3, medium: 2, low: 1 };

      const filtered = (data || [])
        .filter((row) => {
          const targetRole = String(row.target_role || "all").toLowerCase();
          if (!["all", "student"].includes(targetRole)) return false;
          if (!toBoolean(row.is_published, true)) return false;
          if (row.expires_at) {
            const expiresAt = new Date(row.expires_at);
            if (!Number.isNaN(expiresAt.getTime()) && expiresAt <= now) return false;
          }

          const rowDepartment = String(row.department || "").trim();
          if (rowDepartment && department && rowDepartment !== department) return false;

          const rowYear = normalizeYearLevel(row.year);
          if (rowYear && yearLevel && rowYear !== yearLevel) return false;

          return true;
        })
        .map(mapAnnouncement)
        .sort((a, b) => {
          const prioDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          if (prioDiff !== 0) return prioDiff;
          return String(b.published_at || b.created_at || "").localeCompare(
            String(a.published_at || a.created_at || ""),
          );
        });

      return filtered;
    }),

  getProjects: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const assignment = await getActiveAssignmentForUser(currentUser.id);
      if (!assignment) return [];
      const section = await resolveSectionFromAssignment(assignment);
      if (!section?.id) return [];

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("section_id", section.id)
        .order("due_date", { ascending: true });
      if (error) {
        if (isMissingRelation(error)) return [];
        throw formatSupabaseError(error);
      }
      return (data || []).map(mapProject);
    }),

  getCampusProjects: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("campus_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw formatSupabaseError(error);
      return (data || []).map(mapProject);
    }),

  getEvaluationSettings: async () =>
    withApi(async () => {
      const { data, error } = await supabase.from("evaluation_settings").select("*");
      if (error) {
        if (isMissingRelation(error)) {
          return { enabled: true, template: null };
        }
        throw formatSupabaseError(error);
      }

      const byKey = new Map();
      (data || []).forEach((row) => byKey.set(row.setting_key, row.setting_value));

      const enabledValue = byKey.get("enabled") ?? byKey.get("evaluation_enabled");
      const templateRaw = byKey.get("template");

      return {
        enabled: toBoolean(enabledValue, true),
        template: tryParseJson(templateRaw),
      };
    }),

  getEvaluationTeachers: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const assignment = await getActiveAssignmentForUser(currentUser.id);
      if (!assignment) return { teachers: [] };

      const section = await resolveSectionFromAssignment(assignment);
      if (!section?.id && !section?.section_name) return { teachers: [] };

      let assignmentQuery = supabase
        .from("teacher_assignments")
        .select("*")
        .eq("status", "active");

      if (section?.id) {
        assignmentQuery = assignmentQuery.eq("section_id", section.id);
      } else {
        assignmentQuery = assignmentQuery.eq("section", section.section_name);
      }

      const { data: teacherAssignments, error: assignmentError } = await assignmentQuery;
      if (assignmentError) {
        if (isMissingRelation(assignmentError)) return { teachers: [] };
        throw formatSupabaseError(assignmentError);
      }

      const rows = teacherAssignments || [];
      if (!rows.length) return { teachers: [] };

      const teacherIds = Array.from(new Set(rows.map((row) => row.teacher_id).filter(Boolean)));
      const subjectIds = Array.from(new Set(rows.map((row) => row.subject_id).filter(Boolean)));

      const [teachersMap, subjectsMap] = await Promise.all([
        fetchUsersByIds(teacherIds),
        fetchSubjectsByIds(subjectIds),
      ]);

      let evaluatedIds = new Set();
      const { data: evaluations, error: evaluationsError } = await supabase
        .from("teacher_evaluations")
        .select("teacher_id")
        .eq("student_id", currentUser.id)
        .in("teacher_id", teacherIds);
      if (!evaluationsError) {
        evaluatedIds = new Set((evaluations || []).map((row) => row.teacher_id));
      } else if (!isMissingRelation(evaluationsError)) {
        throw formatSupabaseError(evaluationsError);
      }

      const grouped = new Map();
      rows.forEach((row) => {
        const teacher = teachersMap.get(row.teacher_id);
        if (!teacher) return;

        if (!grouped.has(row.teacher_id)) {
          grouped.set(row.teacher_id, {
            id: teacher.id,
            name: teacher.full_name || teacher.username || `Teacher ${teacher.id}`,
            image_path: teacher.image_path || DEFAULT_AVATAR,
            subjects: [],
            evaluated: evaluatedIds.has(teacher.id),
          });
        }

        const subject = subjectsMap.get(row.subject_id);
        const subjectCode = subject?.subject_code || row.subject_code || "";
        const subjectName = subject?.subject_name || row.subject_title || "";
        const current = grouped.get(row.teacher_id);

        const exists = current.subjects.some(
          (entry) => entry.code === subjectCode && entry.title === subjectName,
        );
        if (!exists && (subjectCode || subjectName)) {
          current.subjects.push({
            code: subjectCode,
            title: subjectName,
          });
        }
      });

      return { teachers: Array.from(grouped.values()) };
    }),

  getEvaluation: async (teacherId) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const parsedTeacherId = parseNumber(teacherId, null);
      if (!parsedTeacherId) {
        return { success: false, message: "Invalid teacher id." };
      }

      const { data, error } = await supabase
        .from("teacher_evaluations")
        .select("*")
        .eq("student_id", currentUser.id)
        .eq("teacher_id", parsedTeacherId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (isMissingRelation(error)) {
          return { success: false, message: "Evaluation table is not configured." };
        }
        throw formatSupabaseError(error);
      }

      if (!data) {
        return { success: false, message: "Evaluation not found." };
      }

      const parsedPayload =
        tryParseJson(data.ratings_json) ||
        tryParseJson(data.response_payload) ||
        {};
      const ratings =
        parsedPayload?.ratings && typeof parsedPayload.ratings === "object"
          ? { ...parsedPayload.ratings }
          : {};

      if (Object.keys(ratings).length === 0) {
        if (data.rating_teaching_quality != null) ratings.part1_q1 = Number(data.rating_teaching_quality);
        if (data.rating_communication != null) ratings.part1_q2 = Number(data.rating_communication);
        if (data.rating_preparation != null) ratings.part1_q3 = Number(data.rating_preparation);
        if (data.rating_responsiveness != null) ratings.part1_q4 = Number(data.rating_responsiveness);
        if (data.rating_overall != null) ratings.part2_q1 = Number(data.rating_overall);
        if (data.satisfaction_rating != null) ratings.satisfaction_rating = Number(data.satisfaction_rating);
        if (data.recommend_teacher) ratings.recommend_teacher = data.recommend_teacher;
      }

      return {
        success: true,
        data: {
          student_status: data.student_status || parsedPayload.student_status || "",
          student_gender: data.student_gender || parsedPayload.student_gender || "",
          comments: parsedPayload.comments ?? data.comments ?? "",
          ratings,
        },
      };
    }),

  submitEvaluation: async (formLike) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const input =
        formLike instanceof FormData ? Object.fromEntries(formLike.entries()) : { ...(formLike || {}) };

      const teacherId = parseNumber(input.teacher_id, null);
      if (!teacherId) {
        return { success: false, message: "Teacher is required." };
      }

      const { data: existing, error: existingError } = await supabase
        .from("teacher_evaluations")
        .select("id")
        .eq("student_id", currentUser.id)
        .eq("teacher_id", teacherId)
        .limit(1);
      if (existingError && !isMissingRelation(existingError)) {
        throw formatSupabaseError(existingError);
      }
      if ((existing || []).length > 0) {
        return { success: false, message: "You have already evaluated this teacher." };
      }

      const assignment = await getActiveAssignmentForUser(currentUser.id);
      const section = await resolveSectionFromAssignment(assignment);

      const subjectText = String(input.subject || "")
        .split(",")[0]
        .trim();
      const subjectCode = subjectText.includes(" - ")
        ? subjectText.split(" - ")[0].trim()
        : subjectText;
      const subject = await findSubjectByCode(subjectCode);

      const ratings = {};
      Object.keys(input).forEach((key) => {
        if (/^part\d+_q\d+$/i.test(key) || key === "satisfaction_rating" || key === "recommend_teacher") {
          ratings[key] = input[key];
        }
      });

      const scaleRatings = Object.entries(ratings)
        .filter(([key]) => /^part\d+_q\d+$/i.test(key))
        .map(([, value]) => parseNumber(value, null))
        .filter((value) => value != null && value >= 1 && value <= 5);

      const ratingOverall = scaleRatings.length
        ? Number((scaleRatings.reduce((sum, value) => sum + value, 0) / scaleRatings.length).toFixed(2))
        : parseNumber(ratings.satisfaction_rating, null);

      const payload = {
        teacher_id: teacherId,
        student_id: currentUser.id,
        subject_id: subject?.id || null,
        school_year: assignment?.school_year || section?.school_year || currentSchoolYear(),
        semester: assignment?.semester || "1st Semester",
        rating_teaching_quality: parseNumber(ratings.part1_q1, null),
        rating_communication: parseNumber(ratings.part1_q2, null),
        rating_preparation: parseNumber(ratings.part1_q3, null),
        rating_responsiveness: parseNumber(ratings.part1_q4, null),
        rating_overall: ratingOverall,
        comments: input.comments || "",
        is_anonymous: 1,
        student_status: input.student_status || null,
        student_gender: input.student_gender || null,
        satisfaction_rating: parseNumber(ratings.satisfaction_rating, null),
        recommend_teacher: ratings.recommend_teacher || null,
        ratings_json: JSON.stringify({
          ratings,
          comments: input.comments || "",
          student_status: input.student_status || null,
          student_gender: input.student_gender || null,
        }),
        response_payload: JSON.stringify({
          ratings,
          comments: input.comments || "",
          student_status: input.student_status || null,
          student_gender: input.student_gender || null,
        }),
        created_at: new Date().toISOString(),
      };

      await safeInsertWithFallback("teacher_evaluations", payload);
      return { success: true, message: "Evaluation submitted successfully." };
    }),

  submitFeedback: async (payload) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const message = String(payload?.message || "").trim();
      if (!message) throw new Error("Feedback message is required.");

      const normalizedMap = {
        suggestion: "Suggestion",
        complaint: "Complaint",
        inquiry: "Inquiry",
        shoutout: "Shoutout",
        academic: "Academic",
        facilities: "Facilities",
        service: "Service",
        other: "Other",
      };
      const rawCategory = String(payload?.category || "Other")
        .trim()
        .toLowerCase();
      const category = normalizedMap[rawCategory] || payload?.category || "Other";

      const inserted = await safeInsertWithFallback("feedbacks", {
        student_id: currentUser.id,
        message,
        category,
        status: "unread",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, "id");

      return {
        success: true,
        id: inserted?.id || null,
      };
    }),

  getMyFeedbacks: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .eq("student_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (isMissingRelation(error)) return [];
        throw formatSupabaseError(error);
      }

      const rows = data || [];
      const replierIds = rows.map((row) => row.replied_by).filter(Boolean);
      const repliers = await fetchUsersByIds(replierIds);

      return rows.map((row) => {
        const replier = row.replied_by ? repliers.get(row.replied_by) : null;
        return {
          id: row.id,
          message: row.message,
          category: row.category,
          reply: row.reply || null,
          replied_by_name: replier?.full_name || null,
          replied_by_role: replier?.role || null,
          status: row.status || "unread",
          created_at: row.created_at ? formatDateTime(row.created_at) : "",
          replied_at: row.replied_at ? formatDateTime(row.replied_at) : null,
        };
      });
    }),
};

export const TeacherAPI = {
  getSchedule: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data: assignments, error: assignmentsError } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("teacher_id", currentUser.id)
        .eq("status", "active");
      if (assignmentsError) throw formatSupabaseError(assignmentsError);

      const assignmentIds = (assignments || []).map((row) => row.id);
      if (!assignmentIds.length) return [];

      const { data: schedules, error: schedulesError } = await supabase
        .from("schedules")
        .select("*")
        .in("teacher_assignment_id", assignmentIds);
      if (schedulesError) throw formatSupabaseError(schedulesError);

      return mapScheduleRows(schedules || []);
    }),

  getAnnouncements: async () =>
    withApi(async () => {
      const now = new Date();
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const { data, error } = await supabase.from("announcements").select("*");
      if (error) throw formatSupabaseError(error);

      return (data || [])
        .filter((row) => {
          const targetRole = String(row.target_role || "all").toLowerCase();
          if (!["all", "teacher"].includes(targetRole)) return false;
          if (!toBoolean(row.is_published, true)) return false;
          if (!row.expires_at) return true;
          const expiresAt = new Date(row.expires_at);
          if (Number.isNaN(expiresAt.getTime())) return true;
          return expiresAt > now;
        })
        .map(mapAnnouncement)
        .sort((a, b) => {
          const prioDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          if (prioDiff !== 0) return prioDiff;
          return String(b.published_at || b.created_at || "").localeCompare(
            String(a.published_at || a.created_at || ""),
          );
        });
    }),

  createAnnouncement: async (payload) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("announcements")
        .insert({
          title: payload?.title || "",
          content: payload?.content || "",
          year: payload?.year || null,
          department: payload?.department || null,
          major: payload?.major || null,
          author_id: currentUser.id,
          target_role: payload?.target_role || "teacher",
          priority: payload?.priority || "medium",
          is_published: payload?.is_published == null ? 1 : payload.is_published,
          published_at: payload?.published_at || new Date().toISOString(),
          expires_at: payload?.expires_at || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapAnnouncement(data);
    }),

  deleteAnnouncement: async (id) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const currentRoles = normalizeRoles(currentUser.roles, currentUser.role);

      let query = supabase.from("announcements").delete().eq("id", id);
      if (!currentRoles.includes("admin")) {
        query = query.eq("author_id", currentUser.id);
      }

      const { error } = await query;
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getProjects: async () =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("campus_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        if (isMissingRelation(error)) return [];
        throw formatSupabaseError(error);
      }
      return (data || []).map(mapProject);
    }),

  createProject: async (payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("campus_projects")
        .insert({
          name: payload?.name || payload?.title || "",
          status: payload?.status || "Planned",
          budget: payload?.budget || null,
          start_date: payload?.start_date || payload?.started || null,
          description: payload?.description || null,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapProject(data);
    }),

  updateProject: async (id, payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("campus_projects")
        .update({
          name: payload?.name || payload?.title || "",
          status: payload?.status || "Planned",
          budget: payload?.budget || null,
          start_date: payload?.start_date || payload?.started || null,
          description: payload?.description || null,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return mapProject(data);
    }),

  deleteProject: async (id) =>
    withApi(async () => {
      const { error } = await supabase.from("campus_projects").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getGrades: async (params = {}) =>
    withApi(async () => {
      const section = await findSection({
        sectionId: params?.section_id,
        sectionName: params?.section,
      });
      const subject = await findSubjectByCode(params?.subject);
      if (!section?.id || !subject?.id) return {};

      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("section_id", section.id)
        .eq("subject_id", subject.id);
      if (error) throw formatSupabaseError(error);

      return (data || []).reduce((acc, row) => {
        acc[row.student_id] = {
          student_id: row.student_id,
          prelim_grade: row.prelim_grade,
          midterm_grade: row.midterm_grade,
          finals_grade: row.finals_grade ?? row.final_grade,
        };
        return acc;
      }, {});
    }),

  getTeacherSubjects: async () => TeacherAPI.getSections(),

  getSections: async () =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("teacher_id", currentUser.id)
        .eq("status", "active");
      if (error) throw formatSupabaseError(error);

      const rows = data || [];
      if (!rows.length) return [];

      const sectionIds = Array.from(new Set(rows.map((row) => row.section_id).filter(Boolean)));
      const subjectIds = Array.from(new Set(rows.map((row) => row.subject_id).filter(Boolean)));
      const [sectionsMap, subjectsMap] = await Promise.all([
        fetchSectionsByIds(sectionIds),
        fetchSubjectsByIds(subjectIds),
      ]);

      const grouped = new Map();
      rows.forEach((row) => {
        const section = sectionsMap.get(row.section_id);
        const key = section?.id ? `id:${section.id}` : `name:${row.section || "unknown"}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            id: section?.id || null,
            name: section?.section_name || row.section || "",
            section_name: section?.section_name || row.section || "",
            year_level: section?.grade_level || "",
            grade_level: section?.grade_level || "",
            course: section?.course || null,
            major: section?.major || null,
            school_year: section?.school_year || currentSchoolYear(),
            subjects: [],
          });
        }

        const subject = subjectsMap.get(row.subject_id);
        if (!subject) return;

        const bucket = grouped.get(key);
        if (!bucket.subjects.some((item) => item.id === subject.id)) {
          bucket.subjects.push({
            id: subject.id,
            code: subject.subject_code,
            name: subject.subject_name,
          });
        }
      });

      return Array.from(grouped.values()).filter((item) => item.name);
    }),

  createGrade: async (payload) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const studentId = parseNumber(payload?.student_id, null);
      if (!studentId) throw new Error("Student is required.");

      const subject = await findSubjectByCode(payload?.subject);
      if (!subject) throw new Error("Subject not found.");

      const assignment = await getActiveAssignmentForUser(studentId);
      const section = await resolveSectionFromAssignment(assignment);
      if (!section?.id) throw new Error("Student has no active section assignment.");

      const schoolYear = section.school_year || currentSchoolYear();
      const semester = normalizeSemester(subject.semester || assignment?.semester || "1st Semester");

      const { data: existing, error: existingError } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", studentId)
        .eq("subject_id", subject.id)
        .eq("section_id", section.id)
        .eq("school_year", schoolYear)
        .eq("semester", semester)
        .limit(1)
        .maybeSingle();
      if (existingError) throw formatSupabaseError(existingError);

      const gradePayload = {
        student_id: studentId,
        subject_id: subject.id,
        teacher_id: currentUser.id,
        section_id: section.id,
        school_year: schoolYear,
        semester,
        prelim_grade: parseNumber(payload?.prelim, null),
        midterm_grade: parseNumber(payload?.midterm, null),
        finals_grade: parseNumber(payload?.finals, null),
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { data, error } = await supabase
          .from("grades")
          .update(gradePayload)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw formatSupabaseError(error);
        return data;
      }

      const { data, error } = await supabase
        .from("grades")
        .insert({
          ...gradePayload,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  updateGrade: async (id, payload) =>
    withApi(async () => {
      const { data, error } = await supabase
        .from("grades")
        .update({
          prelim_grade: parseNumber(payload?.prelim, null),
          midterm_grade: parseNumber(payload?.midterm, null),
          finals_grade: parseNumber(payload?.finals, null),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw formatSupabaseError(error);
      return data;
    }),

  deleteGrade: async (id) =>
    withApi(async () => {
      const { error } = await supabase.from("grades").delete().eq("id", id);
      if (error) throw formatSupabaseError(error);
      return { success: true };
    }),

  getStudentsBySection: async (sectionName) =>
    withApi(async () => {
      if (!sectionName) return [];

      const section = await findSection({ sectionName });
      let assignments = [];

      if (section?.id) {
        const { data, error } = await supabase
          .from("user_assignments")
          .select("*")
          .eq("status", "active")
          .eq("section_id", section.id);
        if (error) throw formatSupabaseError(error);
        assignments = data || [];
      } else {
        const { data, error } = await supabase
          .from("user_assignments")
          .select("*")
          .eq("status", "active")
          .ilike("section", sectionName);
        if (error) throw formatSupabaseError(error);
        assignments = data || [];
      }

      const userIds = Array.from(new Set(assignments.map((row) => row.user_id).filter(Boolean)));
      const usersMap = await fetchUsersByIds(userIds);
      return userIds
        .map((id) => usersMap.get(id))
        .filter(Boolean)
        .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));
    }),

  getEvaluationStatistics: async (semester) =>
    withApi(async () => {
      const currentUser = requireStoredUser();
      const { data, error } = await supabase
        .from("teacher_evaluations")
        .select("*")
        .eq("teacher_id", currentUser.id);

      if (error) {
        if (isMissingRelation(error)) {
          return { average_rating: 0, total_evaluations: 0, comments: [] };
        }
        throw formatSupabaseError(error);
      }

      const variants =
        semester && String(semester).trim().toLowerCase() !== "all"
          ? buildSemesterVariants(semester).map((item) => item.toLowerCase())
          : null;

      const filtered = (data || []).filter((row) => {
        if (!variants) return true;
        const raw = String(row.semester || "").trim().toLowerCase();
        if (!raw) return true;
        return variants.includes(raw);
      });

      let total = 0;
      let count = 0;
      const comments = [];

      filtered.forEach((row) => {
        const rating = parseNumber(row.rating_overall ?? row.rating, null);
        if (rating != null) {
          total += rating;
          count += 1;
        }

        const commentText = row.comments || row.comment;
        if (commentText) {
          comments.push({
            text: commentText,
            rating: rating ?? 0,
            date: row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : null,
          });
        }
      });

      comments.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

      return {
        average_rating: count ? total / count : 0,
        total_evaluations: count,
        comments: comments.slice(0, 20),
      };
    }),
};

export default {
  AuthAPI,
  PublicAPI,
  AdminAPI,
  StudentAPI,
  TeacherAPI,
};
