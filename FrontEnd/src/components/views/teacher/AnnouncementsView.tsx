import React, { useState, useEffect, useMemo } from "react";
import baseStyled from "styled-components";
import { TeacherAPI } from 'services/apis/teacher';
import {
  Megaphone,
  Calendar,
  AlertCircle,
  Bell,
  TrendingUp,
  Users,
  Clock,
  Filter,
  X,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import Toast from "../../common/Toast";
import DeleteModal from "../../common/DeleteModal";
import PageSkeleton from "../../loaders/PageSkeleton";
const styled = baseStyled as any;

const AnnouncementsView = ({ isAdmin = false }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Admin state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "medium",
    target_role: "all",
    expires_at: "",
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await TeacherAPI.getAnnouncements();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      setError(err.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await TeacherAPI.createAnnouncement(form);
      showToast("Announcement created successfully!");
      setIsModalOpen(false);
      setForm({
        title: "",
        content: "",
        priority: "medium",
        target_role: "all",
        expires_at: "",
      });
      fetchAnnouncements();
    } catch (err) {
      showToast(err.message || "Failed to create announcement", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await TeacherAPI.deleteAnnouncement(deleteModal.id);
      showToast("Announcement deleted");
      setDeleteModal({ isOpen: false, id: null });
      fetchAnnouncements();
    } catch (err) {
      showToast(err.message || "Failed to delete announcement", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateInput) => {
    try {
      if (!dateInput) return "Date not specified";
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return String(dateInput);
    }
  };

  const getTimeAgo = (dateInput) => {
    try {
      const date = new Date(dateInput);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffDays > 7) return formatDate(dateInput);
      if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      if (diffHours > 0)
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffMins > 0)
        return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      return "Just now";
    } catch (e) {
      return formatDate(dateInput);
    }
  };

  const getPriorityConfig = (priority) => {
    const p = (priority || "medium").toLowerCase();
    if (p === "high") {
      return {
        icon: AlertCircle,
        label: "Urgent",
        color: "#ef4444",
        bg: "rgba(239, 68, 68, 0.1)",
      };
    } else if (p === "medium") {
      return {
        icon: TrendingUp,
        label: "Important",
        color: "#f59e0b",
        bg: "rgba(245, 158, 11, 0.1)",
      };
    } else {
      return {
        icon: Bell,
        label: "Info",
        color: "#3b82f6",
        bg: "rgba(59, 130, 246, 0.1)",
      };
    }
  };

  const getTargetConfig = (targetRole) => {
    const role = (targetRole || "all").toLowerCase();
    if (role === "all")
      return { icon: Users, label: "All Users", color: "#8b5cf6" };
    if (role === "student")
      return { icon: Users, label: "Students", color: "#10b981" };
    if (role === "teacher")
      return { icon: Users, label: "Teachers", color: "var(--accent-primary)" };
    return { icon: Users, label: targetRole, color: "#6b7280" };
  };

  const stats = useMemo(() => {
    const urgent = announcements.filter(
      (a) => (a.priority || "").toLowerCase() === "high",
    ).length;
    const recent = announcements.filter((a) => {
      const date = new Date(a.published_at);
      const daysDiff = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }).length;
    return { total: announcements.length, urgent, recent };
  }, [announcements]);

  const filteredAnnouncements = useMemo(
    () =>
      announcements.filter((a) => {
        if (priorityFilter === "all") return true;
        return (a.priority || "medium").toLowerCase() === priorityFilter;
      }),
    [announcements, priorityFilter],
  );

  if (loading && announcements.length === 0) {
    return (
      <LoadingContainer>
        <PageSkeleton variant="cards" count={4} />
      </LoadingContainer>
    );
  }

  if (error && announcements.length === 0) {
    return (
      <ErrorContainer>
        <AlertCircle size={48} />
        <h3>Failed to Load Announcements</h3>
        <p>{error}</p>
      </ErrorContainer>
    );
  }

  return (
    <Container>
      {toast.show && (
        <Toast {...toast} onClose={() => setToast({ ...toast, show: false })} />
      )}

      <Header>
        <HeaderContent>
          <Megaphone size={32} />
          <div>
            <h2>{isAdmin ? "Announcement" : "Campus Announcements"}</h2>
            <p>
              {isAdmin
                ? "Create and manage department announcements"
                : "Stay informed with the latest news and important updates"}
            </p>
          </div>
        </HeaderContent>
        {isAdmin && (
          <AddButton onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> Create New
          </AddButton>
        )}
      </Header>

      <StatsGrid>
        <StatCard $color="#3b82f6">
          <StatIcon>
            <Bell size={24} />
          </StatIcon>
          <StatContent>
            <StatLabel>Total</StatLabel>
            <StatValue>{stats.total}</StatValue>
          </StatContent>
        </StatCard>
        <StatCard $color="#ef4444">
          <StatIcon>
            <AlertCircle size={24} />
          </StatIcon>
          <StatContent>
            <StatLabel>Urgent</StatLabel>
            <StatValue>{stats.urgent}</StatValue>
          </StatContent>
        </StatCard>
        <StatCard $color="#10b981">
          <StatIcon>
            <Clock size={24} />
          </StatIcon>
          <StatContent>
            <StatLabel>Recent (7 days)</StatLabel>
            <StatValue>{stats.recent}</StatValue>
          </StatContent>
        </StatCard>
      </StatsGrid>

      <FilterSection>
        <FilterLabel>
          <Filter size={16} /> Filter by Priority:
        </FilterLabel>
        <FilterButtons>
          <FilterButton
            $active={priorityFilter === "all"}
            onClick={() => setPriorityFilter("all")}
          >
            All
          </FilterButton>
          <FilterButton
            $active={priorityFilter === "high"}
            $color="#ef4444"
            onClick={() => setPriorityFilter("high")}
          >
            Urgent
          </FilterButton>
          <FilterButton
            $active={priorityFilter === "medium"}
            $color="#f59e0b"
            onClick={() => setPriorityFilter("medium")}
          >
            Important
          </FilterButton>
          <FilterButton
            $active={priorityFilter === "low"}
            $color="#3b82f6"
            onClick={() => setPriorityFilter("low")}
          >
            Info
          </FilterButton>
          {priorityFilter !== "all" && (
            <ClearFilterButton onClick={() => setPriorityFilter("all")}>
              <X size={14} /> Clear
            </ClearFilterButton>
          )}
        </FilterButtons>
      </FilterSection>

      {filteredAnnouncements.length === 0 ? (
        <EmptyState>
          <Megaphone size={64} />
          <h3>No Announcements Found</h3>
          <p>
            {priorityFilter !== "all"
              ? "No announcements match your current filter."
              : "There are currently no announcements to display."}
          </p>
        </EmptyState>
      ) : (
        <AnnouncementsGrid>
          {filteredAnnouncements.map((announcement, index) => {
            const priorityConfig = getPriorityConfig(announcement.priority);
            const targetConfig = getTargetConfig(announcement.target_role);
            return (
              <AnnouncementCard key={announcement.id || index}>
                <CardAccent $color={priorityConfig.color} />
                <CardHeader>
                  <TitleSection>
                    <AnnouncementTitle>
                      {announcement.title || "Untitled"}
                    </AnnouncementTitle>
                    <MetaInfo>
                      <TimeStamp>
                        <Clock size={14} />{" "}
                        {getTimeAgo(announcement.published_at)}
                      </TimeStamp>
                    </MetaInfo>
                  </TitleSection>
                  <PriorityBadge
                    $color={priorityConfig.color}
                    $bg={priorityConfig.bg}
                  >
                    <priorityConfig.icon size={14} />
                    <span>{priorityConfig.label}</span>
                  </PriorityBadge>
                </CardHeader>
                <CardBody>
                  <Content
                    dangerouslySetInnerHTML={{
                      __html: (announcement.content || "").replace(
                        /\n/g,
                        "<br>",
                      ),
                    }}
                  />
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <TargetBadge $color={targetConfig.color}>
                      <targetConfig.icon size={12} />{" "}
                      <span>{targetConfig.label}</span>
                    </TargetBadge>
                    {announcement.expires_at && (
                      <ExpiryInfo>
                        <Calendar size={12} />{" "}
                        <span>
                          Expires: {formatDate(announcement.expires_at)}
                        </span>
                      </ExpiryInfo>
                    )}
                  </div>
                  {isAdmin && (
                    <DeleteIconButton
                      onClick={() =>
                        setDeleteModal({ isOpen: true, id: announcement.id })
                      }
                    >
                      <Trash2 size={16} />
                    </DeleteIconButton>
                  )}
                </CardFooter>
              </AnnouncementCard>
            );
          })}
        </AnnouncementsGrid>
      )}

      {isModalOpen && (
        <ModalOverlay onClick={() => setIsModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>Create New Announcement</h3>
              <CloseButton onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </CloseButton>
            </ModalHeader>
            <form onSubmit={handleSubmit}>
              <ModalBody>
                <div className="mb-3">
                  <Label>Title</Label>
                  <Input
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    required
                    placeholder="Announcement Title"
                  />
                </div>
                <div className="mb-3">
                  <Label>Content</Label>
                  <TextArea
                    name="content"
                    value={form.content}
                    onChange={handleFormChange}
                    required
                    rows="5"
                    placeholder="Details..."
                  />
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <Label>Priority</Label>
                    <Select
                      name="priority"
                      value={form.priority}
                      onChange={handleFormChange}
                    >
                      <option value="low">Low (Info)</option>
                      <option value="medium">Medium (Important)</option>
                      <option value="high">High (Urgent)</option>
                    </Select>
                  </div>
                  <div className="col-md-6">
                    <Label>Target Audience</Label>
                    <Select
                      name="target_role"
                      value={form.target_role}
                      onChange={handleFormChange}
                    >
                      <option value="all">All Users</option>
                      <option value="student">Students Only</option>
                      <option value="teacher">Teachers Only</option>
                    </Select>
                  </div>
                  <div className="col-12">
                    <Label>Expiry Date (Optional)</Label>
                    <Input
                      type="date"
                      name="expires_at"
                      value={form.expires_at}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <CancelButton
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </CancelButton>
                <SaveButton type="submit" disabled={loading}>
                  <Save size={18} /> Publish
                </SaveButton>
              </ModalFooter>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        itemName="announcement"
        isLoading={loading}
      />
    </Container>
  );
};

// ... Styles ... (I'll reuse and adapt the existing ones but consolidated)
const Container = styled.div`
  animation: fadeIn 0.4s ease-out;
  max-width: 1400px;
  margin: 0 auto;
`;
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;
const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  h2 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0;
  }
  p {
    color: var(--text-secondary);
    margin: 0;
  }
  svg {
    color: var(--accent-primary);
  }
`;
const AddButton = styled.button`
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }
`;
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;
const StatCard = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-4px);
    border-color: ${(props) => props.$color};
  }
`;
const StatIcon = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
`;
const StatContent = styled.div`
  flex: 1;
`;
const StatLabel = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
`;
const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
`;
const FilterSection = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;
const FilterLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;
const FilterButtons = styled.div`
  display: flex;
  gap: 10px;
`;
const FilterButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid
    ${(props) =>
      props.$active
        ? props.$color || "var(--accent-primary)"
        : "var(--border-color)"};
  background: ${(props) =>
    props.$active
      ? props.$color || "var(--accent-primary)"
      : "var(--bg-tertiary)"};
  color: ${(props) => (props.$active ? "white" : "var(--text-primary)")};
  font-weight: 600;
  cursor: pointer;
`;
const ClearFilterButton = styled.button`
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
`;
const AnnouncementsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.5rem;
`;
const AnnouncementCard = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
  }
`;
const CardAccent = styled.div`
  height: 4px;
  background: ${(props) => props.$color};
`;
const CardHeader = styled.div`
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;
const TitleSection = styled.div`
  flex: 1;
`;
const AnnouncementTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
`;
const MetaInfo = styled.div`
  display: flex;
  gap: 10px;
`;
const TimeStamp = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-secondary);
`;
const PriorityBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  background: ${(props) => props.$bg};
  color: ${(props) => props.$color};
  font-size: 0.75rem;
  font-weight: 700;
`;
const CardBody = styled.div`
  padding: 0 1.5rem 1.5rem 1.5rem;
  flex: 1;
`;
const Content = styled.div`
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.95rem;
`;
const CardFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const TargetBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: ${(props) => props.$color};
  font-size: 0.75rem;
  font-weight: 600;
`;
const ExpiryInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary);
`;
const DeleteIconButton = styled.button`
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  &:hover {
    color: #ef4444;
  }
`;
const EmptyState = styled.div`
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary);
  svg {
    opacity: 0.2;
    margin-bottom: 1rem;
  }
`;
const LoadingContainer = styled.div`
  text-align: center;
  padding: 4rem;
`;
const ErrorContainer = styled.div`
  text-align: center;
  padding: 4rem;
  color: #ef4444;
`;
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;
const ModalContent = styled.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  overflow: hidden;
`;
const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  h3 {
    margin: 0;
  }
`;
const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
`;
const ModalBody = styled.div`
  padding: 1.5rem;
`;
const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;
const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  font-size: 0.9rem;
`;
const Input = styled.input`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
`;
const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  resize: none;
`;
const Select = styled.select`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
`;
const SaveButton = styled.button`
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
`;
const CancelButton = styled.button`
  background: none;
  border: 1px solid var(--border-color);
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
`;

export default AnnouncementsView;
