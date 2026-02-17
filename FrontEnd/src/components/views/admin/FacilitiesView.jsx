import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { AdminAPI } from '../../../services/api';
import { 
  Building2, PlusCircle, Trash2, Edit2, Save, XCircle, Layout, Layers, DoorClosed, 
  MapPin, CheckCircle, AlertTriangle, X
} from 'lucide-react';
import Toast from '../../common/Toast';
import DeleteModal from '../../common/DeleteModal';
import PageSkeleton from '../../loaders/PageSkeleton';

const FacilitiesView = () => {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  
  const [buildings, setBuildings] = useState([]);
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]); 
  
  
  const [deleteModal, setDeleteModal] = useState({
      isOpen: false,
      type: null, 
      id: null,
      name: ''
  });

  
  const [isAddBuildingModalOpen, setIsAddBuildingModalOpen] = useState(false);

  
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    floors: 4,
    rooms_per_floor: 4
  });

  
  const [assignForm, setAssignForm] = useState({
    year: '',
    section: '',
    building: '',
    floor: 1,
    room: ''
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const [bData, sData, aData] = await Promise.all([
        AdminAPI.getBuildings(forceRefresh ? { refresh: 1 } : undefined).catch(() => []),
        AdminAPI.getSections().catch(() => []),
        AdminAPI.getSectionAssignments().catch(() => [])
      ]);

      
      const normBuildings = Array.isArray(bData) 
        ? bData.map(b => typeof b === 'string' ? { name: b, floors: 4, rooms_per_floor: 4 } : b)
        : [];
      setBuildings(normBuildings);
      
      setSections(Array.isArray(sData) ? sData : []);
      setAssignments(Array.isArray(aData) ? aData : []);
    } catch (err) {
      console.error("Error loading facilities data:", err);
      showToast("Failed to load facilities data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <PageSkeleton variant="table" columns={7} />;

  const handleBuildingSubmit = async (e) => {
    e.preventDefault();
    try {
      const floors = parseInt(buildingForm.floors, 10);
      const roomsPerFloor = parseInt(buildingForm.rooms_per_floor, 10);
      if (isNaN(floors) || floors < 1 || isNaN(roomsPerFloor) || roomsPerFloor < 1) {
        showToast("Please enter valid floor and room counts.", "error");
        return;
      }
      setLoading(true);
      await AdminAPI.createBuilding({
        building_name: buildingForm.name,
        num_floors: floors,
        rooms_per_floor: roomsPerFloor
      });
      await fetchData(true);
      setBuildingForm({ name: '', floors: 4, rooms_per_floor: 4 });
      setIsAddBuildingModalOpen(false); 
      showToast("Building added successfully");
    } catch (err) {
      showToast(`Error creating building: ${err.message}`, "error");
      if (String(err.message || '').toLowerCase().includes('already')) {
        await fetchData(true);
      }
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteBuilding = (name) => {
      setDeleteModal({
          isOpen: true,
          type: 'building',
          id: name,
          name: `Building ${name}`
      });
  };

  const handleDeleteAssignment = (id) => {
      setDeleteModal({
          isOpen: true,
          type: 'assignment',
          id: id,
          name: 'this section assignment'
      });
  };

  const confirmDelete = async () => {
      const { type, id } = deleteModal;
      if (!type || !id) return;

      try {
          setLoading(true);
          if (type === 'building') {
              await AdminAPI.deleteBuilding(id);
              showToast("Building deleted");
          } else if (type === 'assignment') {
              await AdminAPI.deleteSectionAssignment(id);
              showToast("Assignment removed");
          }
          await fetchData();
          closeDeleteModal();
      } catch (err) {
          showToast(`Error deleting ${type}: ${err.message}`, "error");
      } finally {
          setLoading(false);
      }
  };

  const closeDeleteModal = () => {
      setDeleteModal({ isOpen: false, type: null, id: null, name: '' });
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await AdminAPI.createSectionAssignment({
        year: assignForm.year,
        section: assignForm.section,
        building: assignForm.building.toUpperCase(),
        floor: parseInt(assignForm.floor),
        room: assignForm.room
      });
      await fetchData();
      setAssignForm({ year: '', section: '', building: '', floor: 1, room: '' });
      showToast("Section assigned successfully");
    } catch (err) {
      showToast(`Error assigning section: ${err.message}`, "error");
    } finally {
        setLoading(false);
    }
  };

  
  const handleUpdateAssignment = async (assignmentId, year, sectionName, buildingVal, floorVal, roomVal) => {
    if (!buildingVal || !roomVal) {
      showToast("Please fill in building and room", "error");
      return;
    }

    try {
      setLoading(true);
      
      if (assignmentId) {
        
        const payload = {
          building: buildingVal,
          floor: parseInt(floorVal),
          room: roomVal
        };
        await AdminAPI.updateSectionAssignment(assignmentId, payload);
      } else {
        
        const payload = {
          year,
          section: sectionName,
          building: buildingVal,
          floor: parseInt(floorVal),
          room: roomVal
        };
        await AdminAPI.createSectionAssignment(payload);
      }
      
      await fetchData();
      showToast("Assignment updated");
    } catch (err) {
      showToast(`Error saving assignment: ${err.message}`, "error");
    } finally {
        setLoading(false);
    }
  };

  
  const getAssignment = (year, name) => {
    return assignments.find(a => 
      (a.year === year || a.year === parseInt(year)) && 
      a.section === name
    );
  };

  return (
    <StyledContainer>
      <HeaderSection>
        <div>
          <h2><Building2 size={32} /> Facilities Management</h2>
          <p>Manage campus buildings, floors, and room assignments.</p>
        </div>
      </HeaderSection>

      {toast.show && (
          <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(prev => ({ ...prev, show: false }))} 
          />
      )}

      {}
      <div className="row g-4 mb-4">
        <div className="col-12">
            <Card>
                <CardHeader>
                    <div className="d-flex align-items-center gap-2">
                        <Building2 size={20} />
                        <h3>Campus Buildings</h3>
                    </div>
                    <Button onClick={() => setIsAddBuildingModalOpen(true)}>
                        <PlusCircle size={18} /> Add New Building
                    </Button>
                </CardHeader>
                <CardBody>
                    {buildings.length === 0 ? (
                        <div className="text-center py-5 text-secondary">No buildings configured.</div>
                    ) : (
                        <BuildingGrid>
                            {buildings.map((b, i) => (
                                <BuildingItem key={i}>
                                    <BuildingIcon>
                                        <Building2 size={24} />
                                    </BuildingIcon>
                                    <div className="text-center my-3 flex-grow-1">
                                        <h4 className="m-0 text-primary fw-bold mb-1">{b.name}</h4>
                                        <small className="text-secondary d-block">{b.floors} Floors</small>
                                        <small className="text-secondary d-block">{b.rooms_per_floor} Rooms/Floor</small>
                                    </div>
                                    <OutlineButton className="w-100 justify-content-center" onClick={() => handleDeleteBuilding(b.name)}>
                                        <Trash2 size={16} /> Delete
                                    </OutlineButton>
                                </BuildingItem>
                            ))}
                        </BuildingGrid>
                    )}
                </CardBody>
            </Card>
        </div>
      </div>

      {}
      <div className="row g-4">
        <div className="col-12">
             <Card>
                <CardHeader>
                    <MapPin size={20} />
                    <h3>Section Room Assignments</h3>
                </CardHeader>
                
                {sections.length === 0 ? (
                    <div className="p-5 text-center">
                        <AlertTriangle size={32} className="text-warning mb-2" />
                        <p className="text-secondary">No sections found. Please create sections in the Sections view first.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <Table>
                            <thead>
                                <tr>
                                    <th>Year Level</th>
                                    <th>Section Name</th>
                                    <th>Status</th>
                                    <th style={{ width: '100px' }}>Building</th>
                                    <th style={{ width: '80px' }}>Floor</th>
                                    <th style={{ width: '100px' }}>Room</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sections.map(sec => {
                                    const year = sec.grade_level || sec.year;
                                    const name = sec.section_name || sec.name;
                                    return (
                                        <AssignmentRow 
                                            key={`${year}-${name}`} 
                                            section={{ ...sec, year, name }} 
                                            existing={getAssignment(year, name)} 
                                            buildings={buildings}
                                            onUpdate={handleUpdateAssignment} 
                                            onDelete={handleDeleteAssignment}
                                        />
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                )}
             </Card>
        </div>
      </div>

      <DeleteModal 
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${deleteModal.name}?`}
        itemName={deleteModal.name}
        isLoading={loading}
      />

      {}
      {isAddBuildingModalOpen && (
          <ModalOverlay onClick={() => setIsAddBuildingModalOpen(false)}>
              <ModalContent onClick={e => e.stopPropagation()}>
                  <ModalHeader>
                      <h3><PlusCircle size={20} /> Add New Building</h3>
                      <CloseButton onClick={() => setIsAddBuildingModalOpen(false)}><X size={20} /></CloseButton>
                  </ModalHeader>
                  <form onSubmit={handleBuildingSubmit}>
                      <ModalBody>
                          <div className="row g-3">
                              <div className="col-12">
                                  <FormGroup>
                                      <label>Building Name</label>
                                      <Input 
                                          type="text" placeholder="e.g. Science Wing" 
                                          required 
                                          value={buildingForm.name}
                                          onChange={e => setBuildingForm({...buildingForm, name: e.target.value})}
                                      />
                                  </FormGroup>
                              </div>
                              <div className="col-6">
                                  <FormGroup>
                                      <label>Total Floors</label>
                                      <Input 
                                          type="number" min="1" required 
                                          value={buildingForm.floors}
                                          onChange={e => setBuildingForm({...buildingForm, floors: e.target.value})}
                                      />
                                  </FormGroup>
                              </div>
                              <div className="col-6">
                                  <FormGroup>
                                      <label>Rooms / Floor</label>
                                      <Input 
                                          type="number" min="1" required 
                                          value={buildingForm.rooms_per_floor}
                                          onChange={e => setBuildingForm({...buildingForm, rooms_per_floor: e.target.value})}
                                      />
                                  </FormGroup>
                              </div>
                          </div>
                      </ModalBody>
                      <ModalFooter>
                          <OutlineButton type="button" onClick={() => setIsAddBuildingModalOpen(false)}>
                              Cancel
                          </OutlineButton>
                          <Button type="submit" disabled={loading}>
                              <Save size={18} /> Create Building
                          </Button>
                      </ModalFooter>
                  </form>
              </ModalContent>
          </ModalOverlay>
      )}
    </StyledContainer>
  );
};


const AssignmentRow = ({ section, existing, buildings, onUpdate, onDelete }) => {
  const [building, setBuilding] = useState(existing?.building || '');
  const [floor, setFloor] = useState(existing?.floor || 1);
  const [room, setRoom] = useState(existing?.room || '');
  
  React.useEffect(() => {
    if (existing) {
      setBuilding(existing.building || '');
      setFloor(existing.floor || 1);
      setRoom(existing.room || '');
    }
  }, [existing]);

  const selectedBuildingData = useMemo(
      () => buildings.find(b => b.name === building),
      [buildings, building]
  );
  
  const floorOptions = useMemo(
      () => selectedBuildingData 
          ? Array.from({length: selectedBuildingData.floors || 4}, (_, i) => i + 1)
          : [],
      [selectedBuildingData]
  );

  const roomOptions = useMemo(
      () => (selectedBuildingData && floor) 
          ? Array.from({length: selectedBuildingData.rooms_per_floor || 4}, (_, i) => {
              const floorNum = parseInt(floor);
              const roomNum = (floorNum * 100) + (i + 1);
              return roomNum.toString();
          })
          : [],
      [selectedBuildingData, floor]
  );

  
  const handleBuildingChange = (e) => {
      setBuilding(e.target.value);
      setFloor(1);
      setRoom('');
  };

  const handleFloorChange = (e) => {
      setFloor(e.target.value);
      setRoom('');
  };

  const hasChanges = existing 
    ? (building !== existing.building || floor != existing.floor || room !== existing.room)
    : (building !== '' || room !== '');

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{section.year} Year</td>
      <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{section.name}</td>
      <td>
        {existing ? (
          <StatusBadge className="success">
            <CheckCircle size={12} /> Assigned
          </StatusBadge>
        ) : (
          <StatusBadge className="warning">
             Pending
          </StatusBadge>
        )}
      </td>
      <td>
        <Select 
            className="sm"
            value={building} 
            onChange={handleBuildingChange}
        >
            <option value="">Select Building</option>
            {buildings.map(b => (
                <option key={b.name} value={b.name}>
                    {b.name}
                </option>
            ))}
        </Select>
      </td>
      <td>
        <Select 
            className="sm"
            value={floor} 
            onChange={handleFloorChange}
            disabled={!building}
        >
             {floorOptions.map(f => (
                 <option key={f} value={f}>{f}</option>
             ))}
        </Select>
      </td>
      <td>
        <Select 
            className="sm"
            value={room} 
            onChange={e => setRoom(e.target.value)}
            disabled={!building || !floor}
        >
             <option value="">Select Room</option>
             {roomOptions.map(r => (
                 <option key={r} value={r}>{r}</option>
             ))}
        </Select>
      </td>
      <td style={{ textAlign: 'right' }}>
        <div className="d-flex justify-content-end gap-2">
           <Button 
                className="sm"
                disabled={!hasChanges}
                onClick={() => onUpdate(existing?.id, section.year, section.name, building, floor, room)}
           >
             {existing ? <Save size={14} /> : <PlusCircle size={14} />}
           </Button>
           {existing && (
             <OutlineButton 
               className="sm"
               onClick={() => onDelete(existing.id)}
             >
               <Trash2 size={14} />
             </OutlineButton>
           )}
        </div>
      </td>
    </tr>
  );
};


const StyledContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
  animation: fadeIn 0.4s ease-out;
  color: var(--text-primary);
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

const Card = styled.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  height: 100%;
`;

const CardHeader = styled.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between; 
  align-items: center;
  gap: 10px;
  h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  svg { color: var(--text-secondary); }
`;

const CardBody = styled.div`
   padding: 1.5rem;
   color: var(--text-secondary);
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
  label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
  }
`;

const Input = styled.input`
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); outline: none; }
    
    &.sm {
        padding: 6px 10px;
        font-size: 0.85rem;
        height: 36px;
    }
`;

const Select = styled.select`
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all 0.2s;
    cursor: pointer;
    &:focus { border-color: var(--accent-primary); outline: none; }
    
    &.sm {
        padding: 6px 10px;
        font-size: 0.85rem;
        height: 36px;
    }
`;


const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  &:disabled { opacity: 0.6; cursor: not-allowed; }

  &.sm {
      padding: 6px 12px;
      border-radius: 6px;
      height: 36px;
  }
`;

const OutlineButton = styled.button`
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 6px 12px;
    border-radius: 6px;
    color: #ef4444; 
    cursor: pointer;
    font-weight: 500;
    font-size: 0.9rem;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    &:hover { background: rgba(239, 68, 68, 0.1); border-color: #fecaca; }
    
    &.sm {
        height: 36px;
    }
`;

const BuildingGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    @media (max-width: 1400px) { grid-template-columns: repeat(4, 1fr); }
    @media (max-width: 1100px) { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
    @media (max-width: 500px) { grid-template-columns: 1fr; }
`;

const BuildingItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    transition: transform 0.2s, box-shadow 0.2s;
    &:hover { 
        border-color: var(--accent-primary); 
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }
`;

const BuildingIcon = styled.div`
    width: 60px; height: 60px;
    border-radius: 16px;
    background: var(--bg-tertiary);
    color: var(--accent-primary);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
`;

const Table = styled.table`
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    th {
        text-align: left;
        padding: 1rem;
        color: var(--text-secondary);
        font-weight: 600;
        border-bottom: 2px solid var(--border-color);
        background: var(--bg-tertiary);
    }
    td {
        padding: 12px 1rem;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
    }
    tr:last-child td { border-bottom: none; }
`;

const StatusBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    &.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    &.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
`;


const ModalOverlay = styled.div`
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
`;

const ModalContent = styled.div`
    background: var(--bg-secondary);
    width: 90%; max-width: 550px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const ModalHeader = styled.div`
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex; justify-content: space-between; align-items: center;
    background: var(--bg-tertiary);
    border-radius: 16px 16px 0 0;
    h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
`;

const ModalBody = styled.div`
    padding: 2rem;
`;

const ModalFooter = styled.div`
    padding: 1.25rem 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex; justify-content: flex-end; gap: 1rem;
    background: var(--bg-tertiary);
    border-radius: 0 0 16px 16px;
`;

const CloseButton = styled.button`
    background: transparent; border: none; color: var(--text-secondary); cursor: pointer;
    &:hover { color: var(--text-primary); }
`;

export default FacilitiesView;
