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
let currentPresenceMeta: {
  user_id: number;
  username: string;
  full_name: string;
  role: string;
  tab_id: string;
} | null = null;
let lastSnapshot: ActiveUsersSnapshot = { total: 0, users: [] };
const subscribers = new Set<ActiveUsersSubscriber>();
const PRESENCE_RECONNECT_DELAY_MS = 1200;
let reconnectTimer: number | null = null;
let isPresenceStopping = false;

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

const clearReconnectTimer = () => {
  if (reconnectTimer == null) return;
  window.clearTimeout(reconnectTimer);
  reconnectTimer = null;
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
      const metaUserId = Number(meta?.user_id);
      const keyUserId = Number(key);
      const userId =
        Number.isFinite(metaUserId) && metaUserId > 0
          ? metaUserId
          : Number.isFinite(keyUserId) && keyUserId > 0
            ? keyUserId
            : null;
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

const trackCurrentPresence = async () => {
  if (!presenceChannel || !currentPresenceMeta) return;
  await presenceChannel.track({
    ...currentPresenceMeta,
    user_id: currentPresenceMeta.user_id,
    username: currentPresenceMeta.username,
    full_name: currentPresenceMeta.full_name,
    role: currentPresenceMeta.role,
    tab_id: currentPresenceMeta.tab_id,
    last_seen: new Date().toISOString(),
  });
  buildSnapshotFromChannel();
};

const subscribePresenceEvents = () => {
  if (!presenceChannel) return;
  presenceChannel
    .on("presence", { event: "sync" }, () => buildSnapshotFromChannel())
    .on("presence", { event: "join" }, () => buildSnapshotFromChannel())
    .on("presence", { event: "leave" }, () => buildSnapshotFromChannel());
};

const removePresenceChannel = async () => {
  if (!presenceChannel) return;
  try {
    await presenceChannel.untrack();
  } catch (_) {}
  try {
    supabase.removeChannel(presenceChannel);
  } catch (_) {}
  presenceChannel = null;
};

const schedulePresenceReconnect = () => {
  if (isPresenceStopping || reconnectTimer != null || !currentPresenceMeta) return;
  reconnectTimer = window.setTimeout(async () => {
    reconnectTimer = null;
    if (isPresenceStopping || !currentPresenceMeta) return;
    try {
      await removePresenceChannel();
    } catch (_) {}
    const reconnectUser = {
      id: currentPresenceMeta.user_id,
      username: currentPresenceMeta.username,
      full_name: currentPresenceMeta.full_name,
      role: currentPresenceMeta.role,
    };
    await startActiveUserPresence(reconnectUser);
  }, PRESENCE_RECONNECT_DELAY_MS);
};

export const startActiveUserPresence = async (user: any) => {
  const userId = Number(user?.id);
  if (!Number.isFinite(userId) || userId <= 0) return;

  isPresenceStopping = false;
  clearReconnectTimer();

  const nextKey = String(userId);
  currentPresenceMeta = {
    user_id: userId,
    username: String(user?.username || ""),
    full_name: String(user?.full_name || ""),
    role: String(user?.role || ""),
    tab_id: tabSessionId,
  };

  // Avoid duplicate subscriptions when profile metadata refreshes for the same user.
  if (presenceChannel && currentPresenceKey === nextKey) {
    await refreshActiveUserPresence();
    return;
  }

  if (presenceChannel && currentPresenceKey !== nextKey) {
    await removePresenceChannel();
  }

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
    if (status === "SUBSCRIBED") {
      clearReconnectTimer();
      try {
        await trackCurrentPresence();
      } catch (_) {}
      return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      schedulePresenceReconnect();
    }
  });

  // If already subscribed, refresh track immediately so metadata stays complete.
  try {
    await trackCurrentPresence();
  } catch (_) {
    schedulePresenceReconnect();
  }
};

export const refreshActiveUserPresence = async () => {
  if (!currentPresenceMeta) return;
  if (!presenceChannel) {
    await startActiveUserPresence({
      id: currentPresenceMeta.user_id,
      username: currentPresenceMeta.username,
      full_name: currentPresenceMeta.full_name,
      role: currentPresenceMeta.role,
    });
    return;
  }
  if (!currentPresenceKey) {
    currentPresenceKey = String(currentPresenceMeta.user_id);
  }
  try {
    const state = presenceChannel.presenceState() || {};
    const ownMetaList = Array.isArray(state[currentPresenceKey]) ? state[currentPresenceKey] : [];
    const ownMeta =
      ownMetaList.find((entry: any) => String(entry?.tab_id || "") === tabSessionId) ||
      ownMetaList[0] ||
      null;
    await presenceChannel.track({
      ...(ownMeta || {}),
      ...currentPresenceMeta,
      user_id: currentPresenceMeta.user_id,
      username: currentPresenceMeta.username,
      full_name: currentPresenceMeta.full_name,
      role: currentPresenceMeta.role,
      tab_id: currentPresenceMeta.tab_id,
      last_seen: new Date().toISOString(),
    });
    buildSnapshotFromChannel();
  } catch (_) {
    schedulePresenceReconnect();
  }
};

export const stopActiveUserPresence = async () => {
  isPresenceStopping = true;
  clearReconnectTimer();

  if (!presenceChannel) {
    currentPresenceKey = "";
    currentPresenceMeta = null;
    lastSnapshot = { total: 0, users: [] };
    notifySubscribers();
    return;
  }

  await removePresenceChannel();
  currentPresenceKey = "";
  currentPresenceMeta = null;
  lastSnapshot = { total: 0, users: [] };
  notifySubscribers();
};

export const subscribeToActiveUsers = (callback: ActiveUsersSubscriber) => {
  subscribers.add(callback);
  callback(lastSnapshot);
  return () => subscribers.delete(callback);
};

export const getActiveUsersSnapshot = () => lastSnapshot;
