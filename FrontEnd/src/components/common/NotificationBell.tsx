import React, { useEffect, useMemo, useRef, useState } from "react";
import baseStyled from "styled-components";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { NotificationAPI } from 'services/apis/notification';
import { APP_POLLING_GUARD } from "../../config/runtimeGuards";

const styled = baseStyled as any;

const MAX_UNREAD_ITEMS = 12;
const REALTIME_REFRESH_DEBOUNCE_MS = 400;

const formatRelativeTime = (value) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const truncate = (value, length = 120) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= length) return text;
  return `${text.slice(0, length - 3)}...`;
};

const NotificationBell = () => {
  const [unread, setUnread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [readAllBusy, setReadAllBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  const unreadCount = unread.length;
  const hasUnread = unreadCount > 0;

  const refreshUnread = async (silent = false, forceRefresh = false) => {
    if (!silent) setLoading(true);
    try {
      const rows = await NotificationAPI.getUnread({
        limit: MAX_UNREAD_ITEMS,
        force_refresh: forceRefresh,
      });
      setUnread(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.warn("Failed to refresh notifications:", error?.message || error);
      if (!silent) setUnread([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    refreshUnread(false);

    const queueRealtimeRefresh = () => {
      if (realtimeRefreshTimerRef.current != null) return;
      realtimeRefreshTimerRef.current = window.setTimeout(() => {
        realtimeRefreshTimerRef.current = null;
        refreshUnread(true, true);
      }, REALTIME_REFRESH_DEBOUNCE_MS);
    };

    const stopRealtime = NotificationAPI.subscribeToInbox(() => {
      queueRealtimeRefresh();
    });
    const intervalId = window.setInterval(() => {
      refreshUnread(true);
    }, APP_POLLING_GUARD.notificationUnreadIntervalMs);

    return () => {
      if (realtimeRefreshTimerRef.current != null) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      stopRealtime();
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedActor = useMemo(() => {
    if (!selected) return "";
    const username = String(selected?.actor_username || "").trim();
    const role = String(selected?.actor_role || "").trim();
    if (!username && !role) return "";
    if (!username) return role;
    if (!role) return username;
    return `${username} (${role})`;
  }, [selected]);

  const handleReadNotification = async (notificationId) => {
    const numericId = Number(notificationId);
    if (!Number.isFinite(numericId) || numericId <= 0) return;

    try {
      setBusyId(numericId);
      await NotificationAPI.markAsRead(numericId);
      setUnread((prev) =>
        (Array.isArray(prev) ? prev : []).filter((entry) => Number(entry?.id) !== numericId),
      );
      setSelected((prev) => (Number(prev?.id) === numericId ? null : prev));
    } catch (error) {
      console.warn("Failed to mark notification as read:", error?.message || error);
    } finally {
      setBusyId(null);
    }
  };

  const handleReadAll = async () => {
    if (!unread.length || readAllBusy) return;
    try {
      setReadAllBusy(true);
      await NotificationAPI.markAllAsRead();
      setUnread([]);
      setSelected(null);
    } catch (error) {
      console.warn("Failed to mark all notifications as read:", error?.message || error);
    } finally {
      setReadAllBusy(false);
    }
  };

  return (
    <Wrapper ref={rootRef}>
      <BellButton
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell size={18} />
        {hasUnread && <UnreadBadge>{unreadCount > 99 ? "99+" : unreadCount}</UnreadBadge>}
      </BellButton>

      {open && (
        <Popover role="dialog" aria-label="Unread notifications">
          <PopoverHeader>
            <HeaderTitle>Unread Notifications</HeaderTitle>
            <HeaderActions>
              <ReadAllButton
                type="button"
                disabled={!hasUnread || readAllBusy}
                onClick={handleReadAll}
              >
                <CheckCheck size={14} />
                {readAllBusy ? "Reading..." : "Read all"}
              </ReadAllButton>
              <CloseButton type="button" onClick={() => setOpen(false)}>
                <X size={15} />
              </CloseButton>
            </HeaderActions>
          </PopoverHeader>

          <List>
            {loading && <EmptyState>Loading notifications...</EmptyState>}
            {!loading && unread.length === 0 && (
              <EmptyState>No unread notifications.</EmptyState>
            )}
            {!loading &&
              unread.map((item) => (
                <ListItem key={item.id}>
                  <NotificationButton type="button" onClick={() => setSelected(item)}>
                    <NotificationTitle>{item.title || "System update"}</NotificationTitle>
                    <NotificationMessage>{truncate(item.message, 95)}</NotificationMessage>
                    <NotificationMeta>{formatRelativeTime(item.created_at)}</NotificationMeta>
                  </NotificationButton>
                  <InlineReadButton
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => handleReadNotification(item.id)}
                    aria-label="Mark as read"
                  >
                    <Check size={14} />
                  </InlineReadButton>
                </ListItem>
              ))}
          </List>
        </Popover>
      )}

      {selected && (
        <ModalOverlay onClick={() => setSelected(null)}>
          <ModalCard onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <h4>{selected?.title || "Notification"}</h4>
              <CloseButton type="button" onClick={() => setSelected(null)}>
                <X size={16} />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <p>{selected?.message || "No details available."}</p>
              <MetaLine>
                <strong>When:</strong> {formatDateTime(selected?.created_at)}
              </MetaLine>
              {selectedActor && (
                <MetaLine>
                  <strong>By:</strong> {selectedActor}
                </MetaLine>
              )}
            </ModalBody>
            <ModalFooter>
              <SecondaryButton type="button" onClick={() => setSelected(null)}>
                Close
              </SecondaryButton>
              <PrimaryButton
                type="button"
                disabled={busyId === selected?.id}
                onClick={() => handleReadNotification(selected?.id)}
              >
                {busyId === selected?.id ? "Reading..." : "Mark as read"}
              </PrimaryButton>
            </ModalFooter>
          </ModalCard>
        </ModalOverlay>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  position: relative;
`;

const BellButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;

  &:hover {
    border-color: var(--accent-primary);
    transform: translateY(-1px);
  }
`;

const UnreadBadge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #dc2626;
  color: white;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-primary);
`;

const Popover = styled.div`
  position: absolute;
  top: 52px;
  left: 0;
  width: min(360px, calc(100vw - 32px));
  max-height: 420px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  z-index: 35000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PopoverHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
`;

const HeaderTitle = styled.h4`
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ReadAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 8px;
  font-size: 0.75rem;
  padding: 5px 8px;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const CloseButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const List = styled.div`
  overflow-y: auto;
  max-height: 360px;
  display: flex;
  flex-direction: column;
`;

const EmptyState = styled.div`
  padding: 18px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.86rem;
`;

const ListItem = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }
`;

const NotificationButton = styled.button`
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  padding: 0;
`;

const NotificationTitle = styled.div`
  color: var(--text-primary);
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.35;
  margin-bottom: 4px;
`;

const NotificationMessage = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.45;
  margin-bottom: 4px;
`;

const NotificationMeta = styled.div`
  color: var(--text-tertiary);
  font-size: 0.74rem;
`;

const InlineReadButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-top: 2px;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 38000;
  padding: 16px;
`;

const ModalCard = styled.div`
  width: min(480px, 100%);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;

  h4 {
    margin: 0;
    font-size: 0.98rem;
    color: var(--text-primary);
    font-weight: 700;
  }
`;

const ModalBody = styled.div`
  padding: 14px;
  color: var(--text-secondary);

  p {
    margin: 0 0 10px 0;
    color: var(--text-primary);
    line-height: 1.6;
    white-space: pre-wrap;
  }
`;

const MetaLine = styled.div`
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-top: 6px;

  strong {
    color: var(--text-primary);
    margin-right: 5px;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid var(--border-color);
`;

const SecondaryButton = styled.button`
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
`;

const PrimaryButton = styled.button`
  border: none;
  background: var(--accent-primary);
  color: white;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default NotificationBell;
