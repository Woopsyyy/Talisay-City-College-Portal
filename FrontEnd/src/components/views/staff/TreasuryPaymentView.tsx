import React, { useEffect, useMemo, useState } from "react";
import baseStyled from "styled-components";
import { CreditCard, Filter, Search, Send } from "lucide-react";
import { AdminAPI } from "../../../services/api";
import { COURSE_MAJOR_CONFIG, YEAR_LEVEL_OPTIONS } from "../../../utils/constants";
import Toast from "../../common/Toast";
import PageSkeleton from "../../loaders/PageSkeleton";
const styled = baseStyled as any;

const formatMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const TreasuryPaymentView = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [form, setForm] = useState({
    department: "",
    year: "",
    section: "",
    school_year: "",
    amount: "",
    reason: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const loadPreview = async (activeForm = form) => {
    try {
      setLoading(true);
      const data = await AdminAPI.getPaymentRecords({
        department: activeForm.department || null,
        year: activeForm.year || null,
        section: activeForm.section || null,
        school_year: activeForm.school_year || null,
      });
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(error.message || "Failed to load payment preview.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, []);

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

  const matchedCount = useMemo(
    () =>
      (records || []).filter(
        (row) =>
          (!form.department || row.department === form.department) &&
          (!form.year || String(row.year_level || row.year || "") === String(form.year)) &&
          (!form.section || row.section === form.section),
      ).length,
    [records, form.department, form.year, form.section],
  );

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
        school_year: form.school_year || null,
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
              onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
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
              onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
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
              placeholder="School Year (e.g. 2025-2026)"
              value={form.school_year}
              onChange={(event) => setForm((prev) => ({ ...prev, school_year: event.target.value }))}
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
          Matching students: <strong>{matchedCount}</strong>
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
                  <th>Amount Lacking</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No records in selected scope.</td>
                  </tr>
                ) : (
                  records.map((row) => (
                    <tr key={`${row.user_id}-${row.assignment_id || "none"}`}>
                      <td>
                        <strong>{row.full_name || row.username || `Student #${row.user_id}`}</strong>
                        <SmallText>{row.school_id || row.username || ""}</SmallText>
                      </td>
                      <td>{row.section || "-"}</td>
                      <td>{row.department || "-"}</td>
                      <td>
                        <StatusBadge $owing={String(row.payment_status).toLowerCase() === "owing"}>
                          {String(row.payment_status).toLowerCase() === "owing" ? "Owing" : "Paid"}
                        </StatusBadge>
                      </td>
                      <td>PHP {formatMoney(row.amount_lacking || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrapper>
        )}
      </Card>
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

export default TreasuryPaymentView;


