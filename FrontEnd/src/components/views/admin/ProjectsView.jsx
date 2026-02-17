import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Plus, Folder, Calendar, DollarSign, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { AdminAPI } from '../../../services/api';
import Toast from '../../common/Toast';
import DeleteModal from '../../common/DeleteModal';
import PageSkeleton from '../../loaders/PageSkeleton';

const ProjectsView = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', status: 'Ongoing', budget: '', started: '' });
    
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);

    
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        fetchProjects();
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const data = await AdminAPI.getProjects();
            setProjects(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching projects:", err);
            showToast("Failed to load projects.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await AdminAPI.createProject(formData);
            showToast("Project created successfully!");
            setFormData({ name: '', status: 'Ongoing', budget: '', started: '' });
            setIsModalOpen(false);
            fetchProjects();
        } catch (err) {
            console.error("Create project error:", err);
            showToast("Failed to create project.", "error");
        } finally {
            setLoading(false);
        }
    };

    const openDeleteModal = (project) => {
        setProjectToDelete(project);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setProjectToDelete(null);
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            setLoading(true);
            await AdminAPI.deleteProject(projectToDelete.id);
            showToast("Project deleted successfully!");
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
            closeDeleteModal();
        } catch (err) {
             console.error("Delete project error:", err);
             showToast("Failed to delete project.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <StyledContainer>
            <HeaderSection>
                <div>
                    <h2><Folder size={32} /> Projects</h2>
                    <p>Manage campus projects, budgets, and timelines.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus size={20} /> New Project
                </Button>
            </HeaderSection>
            
            {toast.show && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(prev => ({ ...prev, show: false }))} 
                />
            )}

            {loading && projects.length === 0 ? (
                <PageSkeleton variant="cards" count={4} />
            ) : (
                <MainCard> {}
                    <Grid>
                        {projects.length === 0 ? (
                            <EmptyState>
                                <Folder size={48} className="mb-3" />
                                <h3>No Projects Found</h3>
                                <p>Start by creating a new campus project.</p>
                            </EmptyState>
                        ) : (
                            projects.map(project => (
                                <ProjectCard key={project.id}>
                                    <div className="card-content">
                                        <CardHeader>
                                            <h3>{project.name || project.title}</h3>
                                            <StatusBadge $status={project.status}>{project.status}</StatusBadge>
                                        </CardHeader>
                                        
                                        <div className="details">
                                            <div className="detail-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                <DollarSign size={16} />
                                                <span>Budget</span>
                                                <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>{project.budget}</strong>
                                            </div>
                                            <div className="detail-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                                                <Calendar size={16} />
                                                <span>Started</span>
                                                 <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>
                                                    {project.started || project.start_date 
                                                        ? new Date(project.started || project.start_date).toLocaleDateString() 
                                                        : 'Not set'}
                                                 </strong>
                                            </div>
                                        </div>
                                    </div>
                                    <CardActions>
                                        <ActionButton className="delete" onClick={() => openDeleteModal(project)}>
                                            <Trash2 size={16} /> Delete
                                        </ActionButton>
                                    </CardActions>
                                </ProjectCard>
                            ))
                        )}
                    </Grid>
                </MainCard>
            )}

            {}
            {isModalOpen && (
                <ModalOverlay onClick={() => setIsModalOpen(false)}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <h3>Create New Project</h3>
                            <CloseButton onClick={() => setIsModalOpen(false)}><X size={24} /></CloseButton>
                        </ModalHeader>
                        <form onSubmit={handleSubmit}>
                            <ModalBody>
                                <FormGroup>
                                    <label>Project Name</label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        value={formData.name} 
                                        onChange={handleInputChange} 
                                        required 
                                        placeholder="e.g. Science Lab Renovation"
                                    />
                                </FormGroup>
                                <FormGroup>
                                    <label>Status</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange}>
                                        <option value="Ongoing">Ongoing</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Planned">Planned</option>
                                        <option value="Paused">Paused</option>
                                    </select>
                                </FormGroup>
                                <FormGroup>
                                    <label>Budget</label>
                                    <input 
                                        type="text" 
                                        name="budget" 
                                        value={formData.budget} 
                                        onChange={handleInputChange} 
                                        required 
                                        placeholder="e.g. ₱500,000"
                                    />
                                </FormGroup>
                                <FormGroup>
                                    <label>Start Date</label>
                                    <input 
                                        type="date" 
                                        name="started" 
                                        value={formData.started} 
                                        onChange={handleInputChange} 
                                        required 
                                    />
                                </FormGroup>
                            </ModalBody>
                            <ModalFooter>
                                <SecondaryButton type="button" onClick={() => setIsModalOpen(false)}>Cancel</SecondaryButton>
                                <Button type="submit" disabled={loading}>
                                    <Save size={18} /> Save Project
                                </Button>
                            </ModalFooter>
                        </form>
                    </ModalContent>
                </ModalOverlay>
            )}
             <DeleteModal 
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                title="Delete Project"
                message="Are you sure you want to delete this project? This action cannot be undone."
                itemName={projectToDelete?.title}
                isLoading={loading}
            />
        </StyledContainer>
    );
};


const StyledContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
  animation: fadeIn 0.4s ease-out;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  h2 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 0.5rem;
    svg { color: var(--accent-primary); }
  }
  p { color: var(--text-secondary); font-size: 1.1rem; }
`;

const MainCard = styled.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: var(--shadow-sm);
`;

const Grid = styled.div`
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
`;

const ProjectCard = styled.div`
  background: var(--bg-tertiary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
    border-color: var(--accent-primary);
  }

  .card-content {
      padding: 1.5rem;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  
  h3 { 
    font-size: 1.25rem; 
    font-weight: 700; 
    color: var(--text-primary); 
    margin: 0; 
    line-height: 1.3;
  }
`;

const StatusBadge = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 99px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  
  ${props => {
    switch(props.$status) {
      case 'Ongoing': return `background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2);`;
      case 'Completed': return `background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);`;
      case 'Planned': return `background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2);`;
      default: return `background: var(--bg-tertiary); color: var(--text-secondary);`;
    }
  }}
`;

const CardActions = styled.div`
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-color);
    background: rgba(0,0,0,0.02);
    display: flex;
    justify-content: flex-end;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: var(--accent-highlight); transform: translateY(-1px); }
  &:disabled { opacity: 0.7; }
`;

const SecondaryButton = styled(Button)`
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
  border: 1px solid var(--border-color);
  &:hover { background: var(--border-color); }
`;

const ActionButton = styled.button`
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    transition: all 0.2s;

    &.delete {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        &:hover { background: rgba(239, 68, 68, 0.2); }
    }
`;

const EmptyState = styled.div`
    grid-column: 1 / -1;
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
    h3 { color: var(--text-primary); font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
`;


const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
`;

const ModalContent = styled.div`
  background: var(--bg-secondary);
  width: 90%; max-width: 500px;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  animation: slideUp 0.3s ease;
`;

const ModalHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex; justify-content: space-between; align-items: center;
  h3 { margin: 0; color: var(--text-primary); font-size: 1.2rem; font-weight: 700; }
`;

const CloseButton = styled.button`
  background: transparent; border: none; color: var(--text-tertiary); cursor: pointer;
  &:hover { color: var(--text-primary); }
`;

const ModalBody = styled.div` padding: 1.5rem; `;
const ModalFooter = styled.div`
  padding: 1.25rem 1.5rem; background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  display: flex; justify-content: flex-end; gap: 1rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;
  label { display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem; color: var(--text-primary); }
  input, select {
    width: 100%; padding: 0.75rem; border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); /* Inputs contrast slightly with bg-secondary modal */
    color: var(--text-primary);
    &:focus { outline: none; border-color: var(--accent-primary); }
  }
`;

export default ProjectsView;
