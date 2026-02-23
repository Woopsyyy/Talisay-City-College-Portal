import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ClockCard = ({ className }: { className?: string }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return { time: `${hours}:${minutes}`, ampm };
  };

  const formatDate = (date) => {
    
    const d = date.getDate();
    const suffix = (d) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    };
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    
    return `${dayName}, ${monthName} ${d}${suffix(d)}`;
  };

  const { time: timeStr, ampm } = formatTime(time);
  const dateStr = formatDate(time);

  return (
    <StyledWrapper className={className}>
      <div className="card">
        <p className="time-text"><span>{timeStr}</span><span className="time-sub-text">{ampm}</span></p>
        <p className="day-text">{dateStr}</p>
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" strokeWidth={0} fill="currentColor" stroke="currentColor" className="moon"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" /><path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z" /></svg>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  --clock-bg: linear-gradient(135deg, #f4f7ff, #dbe8ff 58%, #c8dcff);
  --clock-text-primary: #0f172a;
  --clock-text-secondary: #334155;
  --clock-icon: #1e3a8a;
  --clock-shadow:
    0 20px 40px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  --clock-border: rgba(30, 58, 138, 0.16);

  [data-theme='dark'] & {
    --clock-bg: linear-gradient(135deg, #18253b, #223a57 55%, #2d4d70);
    --clock-text-primary: #f8fafc;
    --clock-text-secondary: #dbeafe;
    --clock-icon: #bfdbfe;
    --clock-shadow:
      0 20px 50px rgba(0, 0, 0, 0.55),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    --clock-border: rgba(148, 163, 184, 0.28);
  }

  .card {
    width: 280px;
    height: 150px;
    background: var(--clock-bg);
    border: 1px solid var(--clock-border);
    border-radius: 15px;
    box-shadow: var(--clock-shadow);
    display: flex;
    color: var(--clock-text-primary);
    justify-content: center;
    position: relative;
    flex-direction: column;
    cursor: default;
    transition: all 0.3s ease-in-out;
    overflow: hidden;
  }

  .card:hover {
    transform: translateY(-2px);
  }

  .time-text {
    font-size: 50px;
    margin-top: 0px;
    margin-left: 15px;
    font-weight: 600;
    font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
    color: var(--clock-text-primary);
  }

  .time-sub-text {
    font-size: 15px;
    margin-left: 5px;
    color: var(--clock-text-secondary);
  }

  .day-text {
    font-size: 18px;
    margin-top: 0px;
    margin-left: 15px;
    font-weight: 500;
    font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
    color: var(--clock-text-secondary);
  }

  .moon {
    font-size: 20px;
    position: absolute;
    right: 15px;
    top: 15px;
    transition: all 0.3s ease-in-out;
    color: var(--clock-icon);
  }

  .card:hover > .moon {
    font-size: 23px;
  }`;

export default ClockCard;
