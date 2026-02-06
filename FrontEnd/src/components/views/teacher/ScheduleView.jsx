import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { TeacherAPI } from '../../../services/api';
import Loader from '../../Loader';
import { Calendar, Clock, MapPin, BookOpen, User } from 'lucide-react';

const ScheduleView = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatTime = (timeString) => {
    if (!timeString) return "TBA";
    try {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    } catch (e) {
        return timeString;
    }
  };

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await TeacherAPI.getSchedule();
        setSchedules(Array.isArray(data) ? data : []);
      } catch (err) {
        setSchedules([]); 
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  if (loading) return <Loader />;

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const schedulesByDay = useMemo(() => {
      const grouped = {};
      schedules.forEach(schedule => {
          const day = schedule.day || "Unknown";
          if (!grouped[day]) grouped[day] = [];
          grouped[day].push(schedule);
      });
      return grouped;
  }, [schedules]);

  const sortedDays = useMemo(() => dayOrder.filter(day => schedulesByDay[day]), [dayOrder, schedulesByDay]);

  return (
    <Container>
      <Header>
        <div>
            <Title>Class Schedule</Title>
            <Subtitle>Manage your weekly teaching schedule</Subtitle>
        </div>
        <Calendar size={32} color="var(--accent-primary)" />
      </Header>

      {sortedDays.length === 0 ? (
          <EmptyState>
              <Calendar size={48} />
              <p>No scheduled classes found.</p>
          </EmptyState>
      ) : (
          <Timeline>
              {sortedDays.map(day => (
                  <DayGroup key={day}>
                      <DayLabel>{day}</DayLabel>
                      <ClassGrid>
                          {schedulesByDay[day].map((sched, idx) => (
                              <ClassCard key={idx}>
                                  <TimeBadge>
                                      <Clock size={16} />
                                      {formatTime(sched.time_start)} - {formatTime(sched.time_end)}
                                  </TimeBadge>
                                  <CardContent>
                                      <SubjectName>{sched.subject_name || sched.subject}</SubjectName>
                                      <InfoSection>
                                          <DetailRow>
                                              <User size={14} />
                                              <span>{sched.year} - {sched.section}</span>
                                          </DetailRow>
                                          <DetailRow>
                                              <MapPin size={14} />
                                              <span>building: {sched.building || "TBA"}</span>
                                          </DetailRow>
                                          <DetailRow>
                                              <MapPin size={14} />
                                              <span>floor: {sched.room || "TBA"}</span>
                                          </DetailRow>
                                      </InfoSection>
                                  </CardContent>
                                  <CardDecoration />
                              </ClassCard>
                          ))}
                      </ClassGrid>
                  </DayGroup>
              ))}
          </Timeline>
      )}
    </Container>
  );
};


const Container = styled.div`
  padding: 1rem;
  max-width: 1000px;
  margin: 0 auto;
  animation: fadeIn 0.4s ease-out;
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;

const Header = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;
`;

const Title = styled.h2`
  font-size: 1.75rem; color: var(--text-primary); margin: 0 0 0.5rem 0; font-weight: 800;
`;

const Subtitle = styled.p`
  color: var(--text-secondary); margin: 0; font-size: 1rem;
`;

const EmptyState = styled.div`
  padding: 4rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 1rem;
  svg { opacity: 0.5; }
`;

const Timeline = styled.div`
    display: flex; flex-direction: column; gap: 2rem;
`;

const DayGroup = styled.div`
    display: flex; flex-direction: column; gap: 1rem;
`;

const DayLabel = styled.h3`
    font-size: 1.25rem; color: var(--accent-primary); margin: 0; padding-left: 0.5rem; border-left: 4px solid var(--accent-primary); line-height: 1;
`;

const ClassGrid = styled.div`
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;
`;

const ClassCard = styled.div`
    background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden; position: relative; transition: all 0.2s;
    &:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--accent-primary); }
`;

const TimeBadge = styled.div`
    background: var(--bg-tertiary); color: var(--text-secondary); padding: 0.75rem 1rem; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--border-color);
`;

const CardContent = styled.div`
    padding: 1.25rem;
`;

const SubjectName = styled.h4`
    font-size: 1.2rem; color: var(--accent-primary); margin: 0 0 1rem 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
`;

const InfoSection = styled.div`
    display: flex; flex-direction: column; gap: 0.5rem;
`;

const DetailRow = styled.div`
    display: flex; align-items: center; gap: 0.75rem; color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;
    &:last-child { margin-bottom: 0; }
    svg { color: var(--accent-primary); opacity: 0.8; }
`;

const CardDecoration = styled.div`
    position: absolute; bottom: 0; left: 0; height: 3px; width: 0; background: var(--accent-primary); transition: width 0.2s;
    ${ClassCard}:hover & { width: 100%; }
`;

export default ScheduleView;
