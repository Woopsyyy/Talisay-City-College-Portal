import React, { useState, useEffect, useMemo } from 'react';
import baseStyled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { TeacherAPI } from 'services/apis/teacher';
import { Calendar, Clock, MapPin, BookOpen, User } from 'lucide-react';
import PageSkeleton from '../../loaders/PageSkeleton';
const styled = baseStyled as any;

const ScheduleView = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setError(null);
      } catch (err) {
        setSchedules([]);
        setError(err?.message || 'Failed to load schedule.');
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const schedulesByDay = useMemo(() => {
      const grouped = {};
      const normalizeDay = (value) => {
        if (!value) return 'Unknown';
        const raw = String(value).trim();
        const lower = raw.toLowerCase();
        const map = {
          mon: 'Monday',
          monday: 'Monday',
          tue: 'Tuesday',
          tues: 'Tuesday',
          tuesday: 'Tuesday',
          wed: 'Wednesday',
          weds: 'Wednesday',
          wednesday: 'Wednesday',
          thu: 'Thursday',
          thur: 'Thursday',
          thurs: 'Thursday',
          thursday: 'Thursday',
          fri: 'Friday',
          friday: 'Friday',
          sat: 'Saturday',
          saturday: 'Saturday',
          sun: 'Sunday',
          sunday: 'Sunday',
          '1': 'Monday',
          '2': 'Tuesday',
          '3': 'Wednesday',
          '4': 'Thursday',
          '5': 'Friday',
          '6': 'Saturday',
          '7': 'Sunday',
        };
        if (map[lower]) return map[lower];
        return raw.charAt(0).toUpperCase() + raw.slice(1);
      };

      schedules.forEach(schedule => {
          const day = normalizeDay(schedule.day || schedule.day_of_week || schedule.dayOfWeek);
          if (!grouped[day]) grouped[day] = [];
          grouped[day].push(schedule);
      });
      return grouped;
  }, [schedules]);

  const sortedDays = useMemo(() => {
    const known = dayOrder.filter(day => schedulesByDay[day]);
    const extras = Object.keys(schedulesByDay).filter((day) => !dayOrder.includes(day)).sort();
    return [...known, ...extras];
  }, [dayOrder, schedulesByDay]);

  return (
    <Container>
      <Header>
        <div>
            <Title>Class Schedule</Title>
            <Subtitle>Manage your weekly teaching schedule</Subtitle>
        </div>
        <Calendar size={32} color="var(--accent-primary)" />
      </Header>

      <Surface>
        {loading ? (
          <LoadingWrap>
            <PageSkeleton variant="cards" count={4} />
            <LoadingText>Loading schedule…</LoadingText>
          </LoadingWrap>
        ) : error ? (
          <EmptyState>
            <Calendar size={48} />
            <p>{error}</p>
            <Hint>Try refreshing or contact an admin to assign your schedule.</Hint>
          </EmptyState>
        ) : sortedDays.length === 0 ? (
          <EmptyState>
            <Calendar size={48} />
            <p>No scheduled classes found.</p>
            <Hint>If this looks wrong, ask the admin to assign your subjects.</Hint>
          </EmptyState>
        ) : (
          <Timeline>
            {sortedDays.map(day => (
              <DayGroup key={day}>
                <DayLabel>{day}</DayLabel>
                <ClassGrid>
                  {schedulesByDay[day].map((sched, idx) => (
                    <ClassCard key={`${day}-${idx}`}>
                      <TimeBadge>
                        <Clock size={16} />
                        {formatTime(sched.time_start)} - {formatTime(sched.time_end)}
                      </TimeBadge>
                      <CardContent>
                        <SubjectName>{sched.subject_name || sched.subject || sched.subject_code || 'Subject'}</SubjectName>
                        <InfoSection>
                          <DetailRow>
                            <User size={14} />
                            <span>{sched.year || 'Year'} - {sched.section || sched.section_name || 'Section'}</span>
                          </DetailRow>
                          <DetailRow>
                            <MapPin size={14} />
                            <span>building: {sched.building || "TBA"}</span>
                          </DetailRow>
                          <DetailRow>
                            <MapPin size={14} />
                            <span>floor: {sched.floor || "TBA"}</span>
                          </DetailRow>
                        </InfoSection>
                      </CardContent>
                      {sched.section && sched.subject && (
                        <CardFooter>
                          <GradeButton
                            type="button"
                            onClick={() => {
                              const section = encodeURIComponent(String(sched.section || '').trim());
                              const subject = encodeURIComponent(String(sched.subject || '').trim());
                              navigate(`/teachers/grade_system?section=${section}&subject=${subject}`);
                            }}
                          >
                            Grade This Section
                          </GradeButton>
                        </CardFooter>
                      )}
                      <CardDecoration />
                    </ClassCard>
                  ))}
                </ClassGrid>
              </DayGroup>
            ))}
          </Timeline>
        )}
      </Surface>
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

const Hint = styled.span`
  font-size: 0.9rem;
  color: var(--text-tertiary);
`;

const Surface = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
`;

const LoadingWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2.5rem 1rem;
`;

const LoadingText = styled.span`
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.95rem;
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

const CardFooter = styled.div`
    padding: 0 1.25rem 1rem;
`;

const GradeButton = styled.button`
    width: 100%;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
    }
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
