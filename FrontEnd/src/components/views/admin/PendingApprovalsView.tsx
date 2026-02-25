import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { CheckCircle2, Inbox, Search, XCircle } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { AdminAPI } from 'services/apis/admin';
import { APP_POLLING_GUARD } from "../../../config/runtimeGuards";
import Toast from "../../common/Toast";
import PageSkeleton from "../../loaders/PageSkeleton";

const formatRequestType = (value) => {
  const type = String(value || "").trim().toLowerCase();
  if (!type) return "Request";
  return type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatRequestDescription = (value) => {
  const type = String(value || "").trim().toLowerCase();
  if (type === "password_reset") return "Request to reset account password.";
  if (type === "profile_picture_update") return "Request to update account profile picture.";
  return "Request pending admin approval.";
};

const PendingApprovalsView = () => {
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const [approvingAllRequests, setApprovingAllRequests] = useState(false);
  const [realtimeSyncing, setRealtimeSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const realtimeRefreshTimerRef = useRef(null);

  const filteredRequests = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    if (!keyword) return requests;
    return requests.filter((row) => {
      return (
        String(row.request_type || "").toLowerCase().includes(keyword) ||
        String(row.requester_full_name || "").toLowerCase().includes(keyword) ||
        String(row.requester_username || "").toLowerCase().includes(keyword) ||
        String(row.note || "").toLowerCase().includes(keyword)
      );
    });
  }, [requests, search]);

  const loadRequests = useCallback(async ({ silent = false, forceRefresh = false } = {}) => {
    try {
      if (!silent) setLoadingRequests(true);
      const rows = await AdminAPI.getAccountRequests({
        status: "pending",
        limit: 500,
        force_refresh: forceRefresh,
      });
      setRequests(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setRequests([]);
      setToast({
        show: true,
        message: error.message || "Failed to load account requests.",
        type: "error",
      });
    } finally {
      if (!silent) setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    const intervalId = setInterval(() => {
      if (document.hidden) return;
      loadRequests({ silent: true });
    }, APP_POLLING_GUARD.pendingApprovalsRefreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [loadRequests]);

  const handleSetRequestStatus = async (requestRow, status) => {
    if (!requestRow?.id) return;
    try {
      setUpdatingRequestId(requestRow.id);
      await AdminAPI.setAccountRequestStatus(requestRow.id, status);
      await loadRequests();
      setToast({
        show: true,
        message:
          status === "approved"
            ? `Approved request #${requestRow.id}.`
            : `Rejected request #${requestRow.id}.`,
        type: status === "approved" ? "success" : "warning",
      });
    } catch (error) {
      setToast({
        show: true,
        message: error.message || "Failed to update request status.",
        type: "error",
      });
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const handleApproveAllRequests = async () => {
    if ((requests || []).length === 0) return;
    const confirmed = window.confirm(
      "Approve all pending account requests? This will approve every request type currently pending.",
    );
    if (!confirmed) return;

    try {
      setApprovingAllRequests(true);
      const approvedCount = await AdminAPI.approveAllAccountRequests();
      await loadRequests();
      setToast({
        show: true,
        message: `Approved ${approvedCount} pending request(s).`,
        type: "success",
      });
    } catch (error) {
      setToast({
        show: true,
        message: error.message || "Failed to approve all requests.",
        type: "error",
      });
    } finally {
      setApprovingAllRequests(false);
    }
  };

  const queueRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) return;
    realtimeRefreshTimerRef.current = window.setTimeout(async () => {
      realtimeRefreshTimerRef.current = null;
      try {
        setRealtimeSyncing(true);
        await loadRequests({ silent: true, forceRefresh: true });
      } finally {
        setRealtimeSyncing(false);
      }
    }, 250);
  }, [loadRequests]);

  useEffect(() => {
    const requestsChannel = supabase
      .channel("admin-pending-approvals-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "account_requests" },
        () => queueRealtimeRefresh(),
      )
      .subscribe();

    return () => {
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      supabase.removeChannel(requestsChannel);
    };
  }, [queueRealtimeRefresh]);

  return (
    <Container>
      <Header>
        <div>
          <h2>
            <Inbox size={28} />
            Pending Approval
          </h2>
          <p>Review and process all pending account-related requests from users.</p>
        </div>
        <HeaderActions>
          <PrimaryButton
            type="button"
            onClick={handleApproveAllRequests}
            disabled={loadingRequests || approvingAllRequests || requests.length === 0}
          >
            <CheckCircle2 size={16} />
            {approvingAllRequests ? "Approving All..." : "Approve All Requests"}
          </PrimaryButton>
        </HeaderActions>
      </Header>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      <Card>
        <CardHeader>
          <div>
            <h3>
              <Inbox size={18} />
              Pending Account Requests
            </h3>
            <p>Approve or reject each request individually.</p>
          </div>
          <SearchBar>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by user, request type, or note"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </SearchBar>
        </CardHeader>
        <CardBody>
          <ResultMeta>
            <span>{filteredRequests.length} pending request(s)</span>
            <small>Realtime sync is active for new requests and status updates.</small>
          </ResultMeta>
          <RequestList>
            {loadingRequests ? (
              <InlineSkeletonWrap>
                <PageSkeleton variant="list" compact />
              </InlineSkeletonWrap>
            ) : filteredRequests.length === 0 ? (
              <EmptyState>No pending requests.</EmptyState>
            ) : (
              filteredRequests.map((requestRow) => (
                <RequestRow key={requestRow.id}>
                  <RequestInfo>
                    <strong>{formatRequestType(requestRow.request_type)}</strong>
                    <MetaLine>{formatRequestDescription(requestRow.request_type)}</MetaLine>
                    <MetaLine>
                      {requestRow.requester_full_name || requestRow.requester_username || "Unknown user"} (
                      @{requestRow.requester_username || "unknown"})
                    </MetaLine>
                    <MetaLine>
                      Requested:{" "}
                      {requestRow.created_at ? new Date(requestRow.created_at).toLocaleString() : "N/A"}
                    </MetaLine>
                    {requestRow.note ? <MetaLine>Note: {requestRow.note}</MetaLine> : null}
                  </RequestInfo>
                  <RequestActions>
                    <RowButton
                      type="button"
                      disabled={updatingRequestId === requestRow.id}
                      onClick={() => handleSetRequestStatus(requestRow, "approved")}
                    >
                      <CheckCircle2 size={14} />
                      Approve
                    </RowButton>
                    <RowDangerButton
                      type="button"
                      disabled={updatingRequestId === requestRow.id}
                      onClick={() => handleSetRequestStatus(requestRow, "rejected")}
                    >
                      <XCircle size={14} />
                      Reject
                    </RowDangerButton>
                  </RequestActions>
                </RequestRow>
              ))
            )}
          </RequestList>
        </CardBody>
      </Card>
    </Container>
  );
};

const Container = styled.div`
  max-width: 1300px;
  margin: 0 auto;
  color: var(--text-primary);
`;

const Header = styled.div`
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 2rem;
    font-weight: 800;
    margin: 0 0 6px 0;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Card = styled.section`
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-secondary);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
  }

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px 0;
    font-size: 1.05rem;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
`;

const CardBody = styled.div`
  padding: 16px 18px;
`;

const SearchBar = styled.div`
  position: relative;
  min-width: 320px;

  @media (max-width: 900px) {
    min-width: 0;
  }

  svg {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
  }

  input {
    width: 100%;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 8px;
    padding: 10px 11px 10px 34px;
    font-size: 0.92rem;
  }
`;

const ResultMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 10px;
  gap: 10px;

  small {
    font-size: 0.8rem;
  }
`;

const RequestList = styled.div`
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  overflow: hidden;
`;

const RequestRow = styled.div`
  border-bottom: 1px solid var(--border-color);
  padding: 12px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 820px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const RequestInfo = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    font-size: 0.95rem;
  }
`;

const MetaLine = styled.span`
  color: var(--text-secondary);
  font-size: 0.83rem;
  word-break: break-word;
`;

const RequestActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 820px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const RowButton = styled.button`
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: var(--bg-tertiary);
  }
`;

const RowDangerButton = styled(RowButton)`
  border-color: rgba(239, 68, 68, 0.35);
  color: #ef4444;

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.1);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 18px;
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.9rem;
`;

const InlineSkeletonWrap = styled.div`
  padding: 4px 0;
`;

const PrimaryButton = styled.button`
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--accent-primary);
  color: white;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover:not(:disabled) {
    background: var(--accent-highlight);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover:not(:disabled) {
    background: var(--bg-tertiary);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export default PendingApprovalsView;
