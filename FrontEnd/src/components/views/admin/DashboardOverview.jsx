import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AdminAPI } from '../../../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Users, Building2, BookOpen, RefreshCw } from 'lucide-react';
import Loader from '../../Loader';

const DashboardOverview = () => {
  const [stats, setStats] = useState({
    users: 0,
    buildings: 0,
    subjects: 0,
    students: 0,
    teachers: 0,
    admins: 0
  });
  
  const [graphs, setGraphs] = useState({
    userDistribution: [],
    buildingUsage: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [users, buildings, subjects] = await Promise.all([
        AdminAPI.getUsers().catch(() => []),
        AdminAPI.getBuildings().catch(() => []),
        AdminAPI.getSubjects().catch(() => [])
      ]);

      const safeUsers = Array.isArray(users) ? users : [];
      const safeBuildings = Array.isArray(buildings) ? buildings : [];
      const safeSubjects = Array.isArray(subjects) ? subjects : [];

      
      const roleCounts = { Student: 0, Teacher: 0, Admin: 0 };
      safeUsers.forEach(u => {
        const role = u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Unknown';
        if (roleCounts[role] !== undefined) roleCounts[role]++;
      });

      const userDistributionData = [
        { name: 'Students', value: roleCounts.Student, color: '#4ade80' },
        { name: 'Teachers', value: roleCounts.Teacher, color: '#3b82f6' },
        { name: 'Admins', value: roleCounts.Admin, color: '#f43f5e' }
      ];

      const buildingData = safeBuildings.slice(0, 5).map(b => ({
        name: b.name.replace('Building', '').trim(),
        floors: b.floors || 0,
        rooms: (b.rooms_per_floor || 0) * (b.floors || 0)
      }));

      setStats({
        users: safeUsers.length,
        buildings: safeBuildings.length,
        subjects: safeSubjects.length,
        students: roleCounts.Student,
        teachers: roleCounts.Teacher,
        admins: roleCounts.Admin
      });

      setGraphs({
        userDistribution: userDistributionData,
        buildingUsage: buildingData
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader /></div>;
  }

  return (
    <StyledContainer>
      <HeaderSection>
        <div>
          <h2>Dashboard Overview</h2>
          <p>Real-time insights and performance metrics.</p>
        </div>
        <RefreshButton onClick={fetchStats}>
          <RefreshCw size={18} /> Refresh
        </RefreshButton>
      </HeaderSection>

      {}
      <StatsGrid>
        <StatCard>
            <StatHeader>
                <div>
                    <StatLabel style={{ color: '#3b82f6' }}>Total Users</StatLabel>
                    <StatValue>{stats.users}</StatValue>
                </div>
                <IconBox style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    <Users size={24} />
                </IconBox>
            </StatHeader>
            <StatFooter>
                <span><Dot style={{ background: '#4ade80' }}/> {stats.students} Students</span>
                <span><Dot style={{ background: '#3b82f6' }}/> {stats.teachers} Teachers</span>
            </StatFooter>
        </StatCard>

        <StatCard>
            <StatHeader>
                <div>
                    <StatLabel style={{ color: '#f43f5e' }}>Infrastructure</StatLabel>
                    <StatValue>{stats.buildings}</StatValue>
                </div>
                <IconBox style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>
                    <Building2 size={24} />
                </IconBox>
            </StatHeader>
            <StatFooter>
                <span>Active Campus Buildings</span>
            </StatFooter>
        </StatCard>

        <StatCard>
            <StatHeader>
                <div>
                    <StatLabel style={{ color: '#f59e0b' }}>Academic Subjects</StatLabel>
                    <StatValue>{stats.subjects}</StatValue>
                </div>
                <IconBox style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                    <BookOpen size={24} />
                </IconBox>
            </StatHeader>
            <StatFooter>
                <span>Registered Course Offerings</span>
            </StatFooter>
        </StatCard>
      </StatsGrid>

      {}
      <ChartsGrid>
        <ChartCard>
            <CardTitle>User Distribution</CardTitle>
            <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={graphs.userDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {graphs.userDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>

        <ChartCard className="wide">
            <CardTitle>Building Capacity Overview</CardTitle>
            <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={graphs.buildingUsage} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                    <Tooltip 
                        cursor={{fill: 'var(--bg-tertiary)'}}
                        contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend />
                    <Bar dataKey="rooms" name="Total Rooms" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="floors" name="Floors" fill="#c4b5fd" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
      </ChartsGrid>
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
    margin: 0 0 0.5rem;
  }
  p { color: var(--text-secondary); margin: 0; font-size: 1.1rem; }
`;

const RefreshButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { background: var(--bg-tertiary); }
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
`;

const StatCard = styled.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s;
    &:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
`;

const StatHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
`;

const StatLabel = styled.p`
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.75rem;
    margin: 0 0 8px;
    letter-spacing: 0.5px;
`;

const StatValue = styled.h3`
    font-size: 2.25rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
    line-height: 1;
`;

const IconBox = styled.div`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const StatFooter = styled.div`
    display: flex;
    gap: 12px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    span { display: flex; align-items: center; gap: 6px; }
`;

const Dot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
`;

const ChartsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    @media (min-width: 992px) {
        grid-template-columns: 5fr 7fr;
    }
`;

const ChartCard = styled.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
    height: 100%;
`;

const CardTitle = styled.h4`
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 1.5rem;
`;

export default DashboardOverview;
