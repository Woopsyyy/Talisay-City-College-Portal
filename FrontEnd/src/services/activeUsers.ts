import { supabase } from "../supabaseClient";

type ActiveUser = {
  key: string;
  user_id: number | string | null;
  username: string;
  full_name: string;
  role: string;
  last_seen: string;
};

type ActiveUsersSnapshot = {
  total: number;
  users: ActiveUser[];
};

type ActiveUsersSubscriber = (snapshot: ActiveUsersSnapshot) => void;

let presenceChannel: any = null;
let currentPresenceKey = "";
let lastSnapshot: ActiveUsersSnapshot = { total: 0, users: [] };
const subscribers = new Set<ActiveUsersSubscriber>();

const tabSessionId = (() => {
  try {
    const existing = sessionStorage.getItem("tcc_presence_tab_id");
    if (existing) return existing;
    const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("tcc_presence_tab_id", created);
    return created;
  } catch (_) {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
})();

const notifySubscribers = () => {
  subscribers.forEach((callback) => {
    try {
      callback(lastSnapshot);
    } catch (_) {}
  });
};

const buildSnapshotFromChannel = () => {
  if (!presenceChannel) {
    lastSnapshot = { total: 0, users: [] };
    notifySubscribers();
    return;
  }

  const state = presenceChannel.presenceState() || {};
  const usersById = new Map<string, ActiveUser>();

  Object.entries(state).forEach(([key, metas]: [string, any]) => {
    const list = Array.isArray(metas) ? metas : [];
    if (!list.length) return;

    list.forEach((meta: any) => {
      const userId = meta?.user_id ?? null;
      const dedupeKey = String(userId ?? key);
      const previous = usersById.get(dedupeKey);
      const currentLastSeen = String(meta?.last_seen || "");
      const previousLastSeen = String(previous?.last_seen || "");

      if (!previous || currentLastSeen > previousLastSeen) {
        usersById.set(dedupeKey, {
          key,
          user_id: userId,
          username: String(meta?.username || ""),
          full_name: String(meta?.full_name || ""),
          role: String(meta?.role || ""),
          last_seen: currentLastSeen,
        });
      }
    });
  });

  const users = Array.from(usersById.values()).sort((a, b) =>
    String(a.full_name || a.username || a.user_id).localeCompare(
      String(b.full_name || b.username || b.user_id),
    ),
  );

  lastSnapshot = {
    total: users.length,
    users,
  };
  notifySubscribers();
};

const subscribePresenceEvents = () => {
  if (!presenceChannel) return;
  presenceChannel
    .on("presence", { event: "sync" }, () => buildSnapshotFromChannel())
    .on("presence", { event: "join" }, () => buildSnapshotFromChannel())
    .on("presence", { event: "leave" }, () => buildSnapshotFromChannel());
};

export const startActiveUserPresence = async (user: any) => {
  const userId = Number(user?.id);
  if (!Number.isFinite(userId) || userId <= 0) return;

  const nextKey = String(userId);

  if (!presenceChannel) {
    presenceChannel = supabase.channel("tcc-active-users-presence", {
      config: {
        presence: { key: nextKey },
      },
    });
    subscribePresenceEvents();
  }

  currentPresenceKey = nextKey;

  presenceChannel.subscribe(async (status: string) => {
    if (status !== "SUBSCRIBED") return;
    try {
      await presenceChannel.track({
        user_id: userId,
        username: String(user?.username || ""),
        full_name: String(user?.full_name || ""),
        role: String(user?.role || ""),
        tab_id: tabSessionId,
        last_seen: new Date().toISOString(),
      });
      buildSnapshotFromChannel();
    } catch (_) {}
  });
};

export const refreshActiveUserPresence = async () => {
  if (!presenceChannel || !currentPresenceKey) return;
  try {
    const state = presenceChannel.presenceState() || {};
    const ownMeta = Array.isArray(state[currentPresenceKey]) ? state[currentPresenceKey][0] : null;
    await presenceChannel.track({
      ...(ownMeta || {}),
      last_seen: new Date().toISOString(),
    });
  } catch (_) {}
};

export const stopActiveUserPresence = async () => {
  if (!presenceChannel) {
    lastSnapshot = { total: 0, users: [] };
    notifySubscribers();
    return;
  }

  try {
    await presenceChannel.untrack();
  } catch (_) {}
  try {
    supabase.removeChannel(presenceChannel);
  } catch (_) {}

  presenceChannel = null;
  currentPresenceKey = "";
  lastSnapshot = { total: 0, users: [] };
  notifySubscribers();
};

export const subscribeToActiveUsers = (callback: ActiveUsersSubscriber) => {
  subscribers.add(callback);
  callback(lastSnapshot);
  return () => subscribers.delete(callback);
};

export const getActiveUsersSnapshot = () => lastSnapshot;
