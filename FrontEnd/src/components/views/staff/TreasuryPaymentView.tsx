import React, { useEffect, useMemo, useRef, useState } from "react";
import baseStyled from "styled-components";
import { AlertTriangle, CheckCircle2, CreditCard, Filter, Search, Send, X } from "lucide-react";
import { AdminAPI } from 'services/apis/admin';
import { COURSE_MAJOR_CONFIG, YEAR_LEVEL_OPTIONS } from "../../../utils/constants";
import Toast from "../../common/Toast";
import PageSkeleton from "../../loaders/PageSkeleton";
const styled = baseStyled as any;

const formatMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const normalizeDeadline = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const isDeadlineReached = (value) => {
  const normalized = normalizeDeadline(value);
  if (!normalized) return false;
  const cutoff = new Date(`${normalized}T23:59:59.999`);
  if (Number.isNaN(cutoff.getTime())) return false;
  return Date.now() > cutoff.getTime();
};

const TreasuryPaymentView = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState(null);
  const [records, setRecords] = useState([]);
  const [paymentModalRow, setPaymentModalRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const lastLoadRequestIdRef = useRef(0);
  const [form, setForm] = useState({
    department: "",
    year: "",
    section: "",
    deadline: "",
    amount: "",
    reason: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    reason: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const loadPreview = async (activeForm = form) => {
    const requestId = lastLoadRequestIdRef.current + 1;
    lastLoadRequestIdRef.current = requestId;

    try {
      setLoading(true);
      const data = await AdminAPI.getPaymentRecords({
        department: activeForm.department || null,
        year: activeForm.year || null,
        section: activeForm.section || null,
      });

      const safeRows = Array.isArray(data) ? data : [];
      const warningResult = await AdminAPI.warnOverduePayments(safeRows).catch(() => ({ warned_count: 0 }));

      if (Number(warningResult?.warned_count || 0) > 0) {
        const refreshed = await AdminAPI.getPaymentRecords({
          department: activeForm.department || null,
          year: activeForm.year || null,
          section: activeForm.section || null,
        });
        if (requestId !== lastLoadRequestIdRef.current) return;
        setRecords(Array.isArray(refreshed) ? refreshed : safeRows);
        showToast(
          `Issued ${warningResult.warned_count} overdue warning${warningResult.warned_count > 1 ? "s" : ""}.`,
          "warning",
        );
      } else {
        if (requestId !== lastLoadRequestIdRef.current) return;
        setRecords(safeRows);
      }
    } catch (error) {
      if (requestId !== lastLoadRequestIdRef.current) return;
      showToast(error.message || "Failed to load payment preview.", "error");
    } finally {
      if (requestId !== lastLoadRequestIdRef.current) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview(form);
  }, [form.department, form.year, form.section]);

  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (records || [])
            .map((row) => String(row.section || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const filteredRecords = useMemo(
    () =>
      (records || []).filter(
        (row) =>
          (!form.department || String(row.department || "") === String(form.department)) &&
          (!form.year || String(row.year_level || row.year || "") === String(form.year)) &&
          (!form.section || String(row.section || "") === String(form.section)),
      ),
    [records, form.department, form.year, form.section],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [form.department, form.year, form.section]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const applyPayment = async (event) => {
    event.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      showToast("Please enter a valid amount.", "error");
      return;
    }
    if (!form.department && !form.year && !form.section) {
      showToast("Select at least one scope filter (department/year/section).", "error");
      return;
    }

    try {
      setSubmitting(true);
      const result = await AdminAPI.applyGeneralPayment({
        department: form.department || null,
        year: form.year || null,
        section: form.section || null,
        deadline: form.deadline || null,
        amount: Number(form.amount),
        reason: form.reason || "General lacking payment",
      });
      showToast(`Applied payment to ${result?.updated_count || 0} student(s).`);
      await loadPreview(form);
    } catch (error) {
      showToast(error.message || "Failed to apply general payment.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (row) => {
    if (!row?.assignment_id) {
      showToast("Missing assignment reference for this student.", "error");
      return;
    }
    const defaultAmount = Number(row?.amount_lacking || 0);
    setPaymentModalRow(row);
    setPaymentForm({
      amount: defaultAmount > 0 ? String(defaultAmount) : "",
      reason: "",
    });
  };

  const closePaymentModal = () => {
    setPaymentModalRow(null);
    setPaymentForm({
      amount: "",
      reason: "",
    });
  };

  const submitPaidEntry = async (event) => {
    event.preventDefault();
    if (!paymentModalRow?.assignment_id) return;

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Enter a valid paid amount.", "error");
      return;
    }
    if (!String(paymentForm.reason || "").trim()) {
      showToast("Payment reason is required.", "error");
      return;
    }

    try {
      setMarkingPaidId(paymentModalRow.assignment_id);
      const result = await AdminAPI.recordStudentPayment(paymentModalRow.assignment_id, {
        amount,
        reason: paymentForm.reason,
        school_year: paymentModalRow.school_year || null,
      });
      const remaining = Number(result?.remaining_amount_lacking || 0);
      showToast(
        remaining > 0
          ? `Payment saved. Remaining balance: PHP ${formatMoney(remaining)}.`
          : `Payment settled for "${paymentModalRow.full_name || paymentModalRow.username || paymentModalRow.user_id}".`,
      );
      closePaymentModal();
      await loadPreview(form);
    } catch (error) {
      showToast(error.message || "Failed to save payment entry.", "error");
    } finally {
      setMarkingPaidId(null);
    }
  };

  return (
    <Container>
      <Header>
        <div>
          <h2>
            <CreditCard size={30} />
            General Payment Assignment
          </h2>
          <p>Assign lacking payment by department/year/section in one action.</p>
        </div>
      </Header>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      <Card>
        <form onSubmit={applyPayment}>
          <FiltersRow>
            <FilterLabel>
              <Filter size={15} />
              Scope
            </FilterLabel>
            <Select
              value={form.department}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  department: event.target.value,
                  section: "",
                }))
              }
            >
              <option value="">All Departments</option>
              {Object.keys(COURSE_MAJOR_CONFIG).map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </Select>
            <Select
              value={form.year}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  year: event.target.value,
                  section: "",
                }))
              }
            >
              <option value="">All Year Levels</option>
              {YEAR_LEVEL_OPTIONS.map((year) => (
                <option key={year} value={String(year)}>
                  {year} Year
                </option>
              ))}
            </Select>
            <Select
              value={form.section}
              onChange={(event) => setForm((prev) => ({ ...prev, section: event.target.value }))}
            >
              <option value="">All Sections</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={form.deadline}
              onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
            />
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder="Amount (PHP)"
              required
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
            <Input
              placeholder="Reason (optional)"
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            />
            <ApplyButton type="button" onClick={() => loadPreview(form)}>
              <Search size={16} />
              Preview
            </ApplyButton>
            <PrimaryButton type="submit" disabled={submitting}>
              <Send size={16} />
              {submitting ? "Applying..." : "Apply Payment"}
            </PrimaryButton>
          </FiltersRow>
        </form>

        <Summary>
          Matching students: <strong>{filteredRecords.length}</strong>
        </Summary>

        {loading ? (
          <PageSkeleton variant="table" count={6} />
        ) : (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Section</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Warning</th>
                  <th>Amount Lacking</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No records in selected scope.</td>
                  </tr>
                ) : (
                  paginatedRecords.map((row) => {
                    const owing = String(row.payment_status).toLowerCase() === "owing";
                    const deadline = normalizeDeadline(row.deadline);
                    const isOverdue = owing && isDeadlineReached(deadline);
                    const warningIssued = isOverdue || Boolean(row.warning_issued);
                    const isRowLoading = markingPaidId === row.assignment_id;

                    return (
                      <tr key={`${row.user_id}-${row.assignment_id || "none"}`}>
                        <td>
                          <strong>{row.full_name || row.username || `Student #${row.user_id}`}</strong>
                          <SmallText>{row.school_id || row.username || ""}</SmallText>
                        </td>
                        <td>{row.section || "-"}</td>
                        <td>{row.department || "-"}</td>
                        <td>
                          <StatusBadge $owing={owing}>{owing ? "Owing" : "Paid"}</StatusBadge>
                        </td>
                        <td>{deadline || "-"}</td>
                        <td>
                          {warningIssued ? (
                            <WarningBadge>
                              <AlertTriangle size={13} />
                              Warning
                            </WarningBadge>
                          ) : (
                            <SmallText>-</SmallText>
                          )}
                        </td>
                        <td>PHP {formatMoney(row.amount_lacking || 0)}</td>
                        <td>
                          {owing ? (
                            <PaidButton
                              type="button"
                              onClick={() => openPaymentModal(row)}
                              disabled={isRowLoading || submitting}
                            >
                              <CheckCircle2 size={14} />
                              {isRowLoading ? "Saving..." : "Paid"}
                            </PaidButton>
                          ) : (
                            <SmallText>Cleared</SmallText>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </TableWrapper>
        )}

        {totalPages > 1 && (
          <PaginationRow>
            <PageButton
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </PageButton>
            <PageText>
              Page {currentPage} of {totalPages}
            </PageText>
            <PageButton
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </PageButton>
          </PaginationRow>
        )}
      </Card>

      {paymentModalRow && (
        <ModalOverlay onClick={closePaymentModal}>
          <ModalContent onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <h3>Record Payment</h3>
              <CloseButton type="button" onClick={closePaymentModal}>
                <X size={18} />
              </CloseButton>
            </ModalHeader>
            <form onSubmit={submitPaidEntry}>
              <ModalBody>
                <p>
                  Student:{" "}
                  <strong>{paymentModalRow.full_name || paymentModalRow.username}</strong>
                </p>
                <p>
                  Remaining balance:{" "}
                  <strong>PHP {formatMoney(paymentModalRow.amount_lacking || 0)}</strong>
                </p>
                <FormGroup>
                  <label>Amount Paid</label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
                    }
                  />
                </FormGroup>
                <FormGroup>
                  <label>Reason</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Bonifacio"
                    value={paymentForm.reason}
                    onChange={(event) =>
                      setPaymentForm((prev) => ({ ...prev, reason: event.target.value }))
                    }
                  />
                </FormGroup>
              </ModalBody>
              <ModalFooter>
                <SecondaryButton type="button" onClick={closePaymentModal}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={markingPaidId === paymentModalRow.assignment_id}>
                  {markingPaidId === paymentModalRow.assignment_id ? "Saving..." : "Save Payment"}
                </PrimaryButton>
              </ModalFooter>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease;
`;

const Header = styled.div`
  margin-bottom: 1.5rem;
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.9rem;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-primary);
  }
  p {
    margin: 0;
    color: var(--text-secondary);
  }
`;

const Card = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1.25rem;
`;

const FiltersRow = styled.div`
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const FilterLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.86rem;
  font-weight: 700;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.62rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const Select = styled.select`
  width: 100%;
  padding: 0.62rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const ApplyButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: 8px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  font-weight: 700;
  cursor: pointer;
`;

const Summary = styled.div`
  margin-bottom: 0.8rem;
  color: var(--text-secondary);
  strong {
    color: var(--text-primary);
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: 0.78rem 0.55rem;
    border-bottom: 1px solid var(--border-color);
    text-align: left;
  }
  th {
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 700;
  }
  td {
    color: var(--text-primary);
  }
`;

const SmallText = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-top: 2px;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  justify-content: center;
  padding: 4px 9px;
  border-radius: 999px;
  background: ${(props) => (props.$owing ? "rgba(245,158,11,0.14)" : "rgba(16,185,129,0.14)")};
  color: ${(props) => (props.$owing ? "#d97706" : "#059669")};
  font-weight: 700;
`;

const WarningBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
  font-weight: 700;
  font-size: 0.75rem;
`;

const PaidButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  font-weight: 700;
  padding: 0.35rem 0.55rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding-top: 1rem;
`;

const PageButton = styled.button`
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  border-radius: 8px;
  padding: 0.45rem 0.8rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageText = styled.span`
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.88rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 16px;
`;

const ModalContent = styled.div`
  width: 100%;
  max-width: 520px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 1rem 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  h3 {
    margin: 0;
    color: var(--text-primary);
  }
`;

const CloseButton = styled.button`
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
`;

const ModalBody = styled.div`
  padding: 1rem 1.2rem;
  p {
    margin-top: 0;
    color: var(--text-secondary);
  }
`;

const FormGroup = styled.div`
  margin-bottom: 0.9rem;
  label {
    display: block;
    margin-bottom: 0.4rem;
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 600;
  }
`;

const ModalFooter = styled.div`
  padding: 0.95rem 1.2rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
`;

const SecondaryButton = styled.button`
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  border-radius: 8px;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
`;

export default TreasuryPaymentView;


