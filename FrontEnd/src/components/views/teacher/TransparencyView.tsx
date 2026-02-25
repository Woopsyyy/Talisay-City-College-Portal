import React, { useState, useEffect, useMemo } from "react";
import baseStyled from "styled-components";
import { TeacherAPI } from 'services/apis/teacher';
import {
  Briefcase,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  Pause,
  Target,
  Building2,
  Plus,
  Trash2,
  Edit2,
  X,
  Save,
  AlertCircle,
} from "lucide-react";
import Toast from "../../common/Toast";
import DeleteModal from "../../common/DeleteModal";
import PageSkeleton from "../../loaders/PageSkeleton";
const styled = baseStyled as any;

const TransparencyView = ({ isAdmin = false }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [form, setForm] = useState({
    name: "",
    description: "",
    budget: "",
    status: "Planned",
    start_date: "",
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await TeacherAPI.getProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load transparency error:", err);
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
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
      if (editingProject) {
        await TeacherAPI.updateProject(editingProject.id, form);
        showToast("Project updated successfully!");
      } else {
        await TeacherAPI.createProject(form);
        showToast("Project created successfully!");
      }
      setIsModalOpen(false);
      setEditingProject(null);
      setForm({
        name: "",
        description: "",
        budget: "",
        status: "Planned",
        start_date: "",
      });
      fetchProjects();
    } catch (err) {
      showToast(err.message || "Operation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setForm({
      name: project.name || "",
      description: project.description || "",
      budget: String(project.budget || "").replace(/[₱,]/g, ""),
      status: project.status || "Planned",
      start_date: project.start_date || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await TeacherAPI.deleteProject(deleteModal.id);
      showToast("Project deleted");
      setDeleteModal({ isOpen: false, id: null });
      fetchProjects();
    } catch (err) {
      showToast(err.message || "Failed to delete project", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "N/A";
    const cleaned = String(amount).replace(/[₱,]/g, "");
    const num = parseFloat(cleaned);
    if (isNaN(num)) return amount;
    return (
      "₱" +
      num.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusConfig = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "completed")
      return {
        icon: CheckCircle,
        label: "Completed",
        color: "#10b981",
        bg: "rgba(16, 185, 129, 0.1)",
      };
    if (s === "ongoing")
      return {
        icon: Clock,
        label: "Ongoing",
        color: "#3b82f6",
        bg: "rgba(59, 130, 246, 0.1)",
      };
    if (s === "paused")
      return {
        icon: Pause,
        label: "Paused",
        color: "#f59e0b",
        bg: "rgba(245, 158, 11, 0.1)",
      };
    return {
      icon: Target,
      label: "Planned",
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.1)",
    };
  };

  const stats = useMemo(() => {
    const totalBudget = projects.reduce((sum, proj) => {
      const num = parseFloat(String(proj.budget || "0").replace(/[₱,]/g, ""));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
    return {
      totalBudget,
      completed: projects.filter(
        (p) => (p.status || "").toLowerCase() === "completed",
      ).length,
      total: projects.length,
    };
  }, [projects]);

  if (loading && projects.length === 0) {
    return (
      <LoadingContainer>
        <PageSkeleton variant="cards" count={4} />
      </LoadingContainer>
    );
  }

  if (error && projects.length === 0) {
    return (
      <ErrorContainer>
        <AlertCircle size={48} />
        <h3>Failed to Load Projects</h3>
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
          <Building2 size={32} />
          <div>
            <h2>{isAdmin ? "Project" : "Campus Transparency"}</h2>
            <p>
              {isAdmin
                ? "Manage and track departmental projects"
                : "View ongoing and completed campus projects with budget allocation"}
            </p>
          </div>
        </HeaderContent>
        {isAdmin && (
          <AddButton
            onClick={() => {
              setEditingProject(null);
              setForm({
                name: "",
                description: "",
                budget: "",
                status: "Planned",
                start_date: "",
              });
              setIsModalOpen(true);
            }}
          >
            <Plus size={20} /> New Project
          </AddButton>
        )}
      </Header>

      <StatsGrid>
        <StatCard $color="#3b82f6">
          <StatIcon>
            <Briefcase size={24} />
          </StatIcon>
          <StatContent>
            <StatLabel>Total Projects</StatLabel>
            <StatValue>{stats.total}</StatValue>
          </StatContent>
        </StatCard>
        <StatCard $color="#10b981">
          <StatIcon>
            <CheckCircle size={24} />
          </StatIcon>
          <StatContent>
            <StatLabel>Completed</StatLabel>
            <StatValue>{stats.completed}</StatValue>
          </StatContent>
        </StatCard>
        <StatCard $color="#8b5cf6">
          <StatIcon>
            <DollarSign size={24} />
          </StatIcon>
          <StatContent>
            <StatLabel>Total Budget</StatLabel>
            <StatValue>{formatCurrency(stats.totalBudget)}</StatValue>
          </StatContent>
        </StatCard>
      </StatsGrid>

      {projects.length === 0 ? (
        <EmptyState>
          <Target size={64} />
          <h3>No Projects Available</h3>
          <p>There are currently no campus projects to display.</p>
        </EmptyState>
      ) : (
        <ProjectsGrid>
          {projects.map((project, index) => {
            const statusConfig = getStatusConfig(project.status);
            return (
              <ProjectCard key={project.id || index}>
                <CardHeader>
                  <ProjectTitle>{project.name}</ProjectTitle>
                  <StatusBadge
                    $color={statusConfig.color}
                    $bg={statusConfig.bg}
                  >
                    <statusConfig.icon size={16} />
                    <span>{statusConfig.label}</span>
                  </StatusBadge>
                </CardHeader>
                <ProjectDescription>{project.description}</ProjectDescription>
                <ProjectDetails>
                  <DetailItem>
                    <DetailIcon>
                      <DollarSign size={18} />
                    </DetailIcon>
                    <DetailContent>
                      <DetailLabel>Budget</DetailLabel>
                      <DetailValue>
                        {formatCurrency(project.budget)}
                      </DetailValue>
                    </DetailContent>
                  </DetailItem>
                  <DetailItem>
                    <DetailIcon>
                      <Calendar size={18} />
                    </DetailIcon>
                    <DetailContent>
                      <DetailLabel>Start Date</DetailLabel>
                      <DetailValue>
                        {formatDate(project.start_date)}
                      </DetailValue>
                    </DetailContent>
                  </DetailItem>
                </ProjectDetails>
                {isAdmin && (
                  <ActionButtons>
                    <IconButton
                      onClick={() => handleEdit(project)}
                      $color="#3b82f6"
                    >
                      <Edit2 size={16} />
                    </IconButton>
                    <IconButton
                      onClick={() =>
                        setDeleteModal({ isOpen: true, id: project.id })
                      }
                      $color="#ef4444"
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </ActionButtons>
                )}
                <CardFooter $color={statusConfig.color} />
              </ProjectCard>
            );
          })}
        </ProjectsGrid>
      )}

      {isModalOpen && (
        <ModalOverlay onClick={() => setIsModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>{editingProject ? "Edit Project" : "Add Project"}</h3>
              <XButton onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </XButton>
            </ModalHeader>
            <form onSubmit={handleSubmit}>
              <ModalBody>
                <div className="mb-3">
                  <Label>Project Name</Label>
                  <Input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <Label>Description</Label>
                  <TextArea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    rows="3"
                  />
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <Label>Budget (₱)</Label>
                    <Input
                      type="number"
                      name="budget"
                      value={form.budget}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <Label>Status</Label>
                    <Select
                      name="status"
                      value={form.status}
                      onChange={handleFormChange}
                    >
                      <option value="Planned">Planned</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Paused">Paused</option>
                      <option value="Completed">Completed</option>
                    </Select>
                  </div>
                  <div className="col-12">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      name="start_date"
                      value={form.start_date}
                      onChange={handleFormChange}
                      required
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
                  <Save size={18} /> {editingProject ? "Update" : "Create"}
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
        title="Delete Project"
        message="Remove this project from the transparency board?"
        itemName="project"
        isLoading={loading}
      />
    </Container>
  );
};

const Container = styled.div`
  animation: fadeIn 0.3s;
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
`;
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
const ProjectsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
`;
const ProjectCard = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
`;
const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
`;
const ProjectTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.4;
`;
const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  background: ${(props) => props.$bg};
  color: ${(props) => props.$color};
  font-size: 0.8rem;
  font-weight: 600;
`;
const ProjectDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 1.25rem;
`;
const ProjectDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;
const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
const DetailIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
`;
const DetailContent = styled.div`
  flex: 1;
`;
const DetailLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;
const DetailValue = styled.div`
  font-size: 1rem;
  font-weight: 600;
`;
const ActionButtons = styled.div`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  display: none;
  gap: 8px;
  ${ProjectCard}:hover & {
    display: flex;
  }
`;
const IconButton = styled.button`
  background: white;
  border: 1px solid var(--border-color);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.$color};
  cursor: pointer;
  &:hover {
    background: var(--bg-tertiary);
  }
`;
const CardFooter = styled.div`
  height: 4px;
  background: linear-gradient(90deg, ${(props) => props.$color}, transparent);
  margin: 1.25rem -1.5rem -1.5rem -1.5rem;
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
  max-width: 500px;
  overflow: hidden;
`;
const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
`;
const ModalBody = styled.div`
  padding: 1.5rem;
`;
const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;
const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
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
`;
const XButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
`;
const LoadingContainer = styled.div`
  text-align: center;
  padding: 4rem;
`;
const ErrorContainer = styled.div`
  text-align: center;
  padding: 4rem;
`;
const EmptyState = styled.div`
  text-align: center;
  padding: 4rem;
`;

export default TransparencyView;
