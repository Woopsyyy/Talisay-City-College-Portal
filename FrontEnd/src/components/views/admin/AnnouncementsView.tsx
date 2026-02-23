import React, { useState, useEffect } from 'react';
import baseStyled from 'styled-components';
import { Plus, X, Megaphone, Calendar, Users, Edit2, Trash2, Send, Filter, AlertCircle } from 'lucide-react';
import { AdminAPI } from '../../../services/api';
import DeleteModal from '../../common/DeleteModal';
import Toast from '../../common/Toast';
import PageSkeleton from '../../loaders/PageSkeleton';
const styled = baseStyled as any;

const courseMajorConfig = {
  IT: ["Computer Technology", "Electronics"],
  BSED: ["English", "Physical Education", "Math", "Filipino", "Social Science"],
  HM: ["General"],
  BEED: ["General"],
  TOURISM: ["General"],
};

const AnnouncementsView = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    year: '',
    department: '',
    major: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [majorOptions, setMajorOptions] = useState([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (formData.department) {
      setMajorOptions(courseMajorConfig[formData.department] || []);
    } else {
      setMajorOptions([]);
    }
  }, [formData.department]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.getAnnouncements();
      const list = Array.isArray(data) ? data : (data ? [data] : []);
      setAnnouncements(list);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      showToast("Failed to load announcements.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (announcement = null) => {
    if (announcement) {
      setEditingId(announcement.id);
      setFormData({
        title: announcement.title || '',
        content: announcement.content || '',
        year: announcement.year || '',
        department: announcement.department || '',
        major: announcement.major || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        year: '',
        department: '',
        major: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      year: '',
      department: '',
      major: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingId) {
        await AdminAPI.updateAnnouncement(editingId, formData);
        showToast("Announcement updated successfully!");
      } else {
        await AdminAPI.createAnnouncement(formData);
        showToast("Announcement published successfully!");
      }
      closeModal();
      fetchAnnouncements();
    } catch (err) {
      console.error("Save announcement error:", err);
      showToast("Failed to save announcement.", "error");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (announcement) => {
    setItemToDelete(announcement);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setLoading(true);
      await AdminAPI.deleteAnnouncement(itemToDelete.id);
      showToast("Announcement deleted.");
      setAnnouncements(prev => prev.filter(a => a.id !== itemToDelete.id));
      closeDeleteModal();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete announcement.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledContainer>
      <HeaderSection>
        <div>
          <h2><Megaphone size={32} /> Announcements</h2>
          <p>Broadcast updates to the campus community.</p>
        </div>
        <CreateButton onClick={() => openModal()}>
          <Plus size={20} /> New Announcement
        </CreateButton>
      </HeaderSection>

      {toast.show && (
          <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(prev => ({ ...prev, show: false }))} 
          />
      )}

      {loading && announcements.length === 0 ? (
        <PageSkeleton variant="cards" count={4} />
      ) : (
        <MainCard> {}
            <ListSection>
            {announcements.length === 0 ? (
                <EmptyState>
                <AlertCircle size={48} className="mb-3" />
                <h3>No Announcements</h3>
                <p>Create your first announcement to get started.</p>
                </EmptyState>
            ) : (
                <Grid>
                {announcements.map(announcement => (
                    <AnnouncementCard key={announcement.id}>
                    <CardHeader>
                        <h4>{announcement.title}</h4>
                        <Meta>
                            <Calendar size={14} />
                            {announcement.created_at || announcement.date 
                                ? new Date(announcement.created_at || announcement.date).toLocaleDateString()
                                : 'Just now'}
                        </Meta>
                    </CardHeader>
                    
                    <CardContent>
                        {announcement.content}
                    </CardContent>

                    <Tags>
                        {announcement.department && <Tag className="dept">{announcement.department}</Tag>}
                        {announcement.year && <Tag className="year">{announcement.year} Year</Tag>}
                        {!announcement.department && !announcement.year && <Tag className="global">Global</Tag>}
                    </Tags>

                    <CardFooter>
                        <ActionButton onClick={() => openModal(announcement)}>
                            <Edit2 size={16} /> Edit
                        </ActionButton>
                        <ActionButton className="delete" onClick={() => openDeleteModal(announcement)}>
                            <Trash2 size={16} /> Delete
                        </ActionButton>
                    </CardFooter>
                    </AnnouncementCard>
                ))}
                </Grid>
            )}
            </ListSection>
        </MainCard>
      )}

      {}
      {isModalOpen && (
        <ModalOverlay onClick={closeModal}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h3>{editingId ? 'Edit Announcement' : 'New Announcement'}</h3>
              <CloseButton onClick={closeModal}><X size={24} /></CloseButton>
            </ModalHeader>
            <form onSubmit={handleSubmit}>
              <ModalBody>
                <FormGroup>
                  <label>Title</label>
                  <input 
                    type="text" 
                    name="title" 
                    value={formData.title} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="e.g. Midterm Examination Schedule"
                  />
                </FormGroup>
                
                <FormGroup>
                  <label>Content</label>
                  <textarea 
                    name="content" 
                    value={formData.content} 
                    onChange={handleInputChange} 
                    required 
                    rows={5}
                    placeholder="Enter the full announcement details..."
                  />
                </FormGroup>

                <Row>
                  <FormGroup>
                    <label>Year Level</label>
                    <SelectWrapper>
                      <select name="year" value={formData.year} onChange={handleInputChange}>
                        <option value="">All Years</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                       <Users size={16} className="select-icon" />
                    </SelectWrapper>
                  </FormGroup>

                  <FormGroup>
                    <label>Department</label>
                    <SelectWrapper>
                      <select name="department" value={formData.department} onChange={handleInputChange}>
                        <option value="">All Departments</option>
                        {Object.keys(courseMajorConfig).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                       <Users size={16} className="select-icon" />
                    </SelectWrapper>
                  </FormGroup>
                </Row>
                  
                <FormGroup>
                  <label>Major</label>
                  <SelectWrapper>
                    <select 
                      name="major" 
                      value={formData.major} 
                      onChange={handleInputChange}
                      disabled={!formData.department}
                    >
                      <option value="">All Majors</option>
                      {majorOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <Filter size={16} className="select-icon" />
                  </SelectWrapper>
                </FormGroup>
              </ModalBody>
              <ModalFooter>
                <SecondaryButton type="button" onClick={closeModal}>Cancel</SecondaryButton>
                <Button type="submit" disabled={loading}>
                   {loading ? <span className="spinner-border" /> : <Send size={18} />}
                   {editingId ? 'Update' : 'Publish'}
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}

      {}
      <DeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this announcement?"
        itemName={itemToDelete?.title}
        isLoading={loading}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
  color: var(--text-primary);
  animation: fadeIn 0.4s ease-out;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  
  h2 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 12px;
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

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);

  &:hover {
    background: var(--accent-secondary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
`;

const ListSection = styled.div``;

const Grid = styled.div`
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
`;

const AnnouncementCard = styled.div`
  background: var(--bg-tertiary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);

  &:hover { 
    transform: translateY(-4px); 
    box-shadow: var(--shadow-md);
    border-color: var(--accent-primary);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  h4 { 
    font-size: 1.25rem; 
    font-weight: 700; 
    color: var(--text-primary);
    margin: 0 0 6px; 
    line-height: 1.4;
  }
`;

const Meta = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
`;

const CardContent = styled.p`
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  flex-grow: 1;
  font-size: 0.95rem;
  white-space: pre-wrap;
`;

const Tags = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 1.5rem;
`;

const Tag = styled.span`
    font-size: 0.75rem;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 600;
    text-transform: uppercase;
    
    &.dept { background: rgba(74, 144, 226, 0.1); color: #4a90e2; }
    &.year { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    &.global { background: rgba(16, 185, 129, 0.1); color: #10b981; }
`;

const CardFooter = styled.div`
    border-top: 1px solid var(--border-color);
    padding-top: 1rem;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
`;

const ActionButton = styled.button`
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: color 0.2s;

    &:hover { color: var(--accent-primary); }
    &.delete:hover { color: #ef4444; }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);
    h3 { color: var(--text-primary); margin-bottom: 0.5rem; }
`;


const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
`;

const ModalContent = styled.div`
  background: var(--bg-secondary);
  width: 90%; max-width: 600px;
  border-radius: 20px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--border-color);
`;

const ModalHeader = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex; justify-content: space-between; align-items: center;
  h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
`;

const CloseButton = styled.button`
  background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px; border-radius: 50%;
  &:hover { background: var(--bg-tertiary); color: var(--text-primary); }
`;

const ModalBody = styled.div` padding: 2rem; `;

const ModalFooter = styled.div`
  padding: 1.25rem 2rem;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  display: flex; justify-content: flex-end; gap: 1rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;
  label { display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem; color: var(--text-primary); }
  input, textarea {
    width: 100%; padding: 0.75rem; border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    &:focus { outline: none; border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1); }
  }
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const SelectWrapper = styled.div`
    position: relative;
    select {
        width: 100%; padding: 0.75rem; padding-right: 2.5rem; border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary); 
        color: var(--text-primary);
        appearance: none;
        &:focus { outline: none; border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1); }
        &:disabled { background: var(--bg-tertiary); color: var(--text-tertiary); cursor: not-allowed; }
    }
    .select-icon {
        position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none;
    }
`;

const Button = styled.button`
  display: flex; align-items: center; gap: 8px;
  background: var(--accent-primary); color: white; border: none;
  padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 600; cursor: pointer;
  
  &:hover { background: var(--accent-secondary); transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const SecondaryButton = styled(Button)`
  background: var(--btn-secondary-bg); color: var(--btn-secondary-text); border: 1px solid var(--border-color);
  &:hover { background: var(--border-color); }
`;

export default AnnouncementsView;
