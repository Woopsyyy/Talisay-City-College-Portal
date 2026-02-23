import React, { useEffect, useMemo, useState } from "react";
import baseStyled from "styled-components";
import {
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  GraduationCap,
  Percent,
  RefreshCw,
  School,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AdminAPI } from "../../../services/api";
import { getActiveUsersSnapshot, subscribeToActiveUsers } from "../../../services/activeUsers";
import PageSkeleton from "../../loaders/PageSkeleton";
import { useTheme } from "../../../context/ThemeContext";

const styled = baseStyled as any;

type DashboardMetrics = {
  users: number;
  students: number;
  teachers: number;
  admins: number;
  nonTeaching: number;
  buildings: number;
  subjects: number;
  sections: number;
  schedules: number;
  announcements: number;
  studyLoad: number;
};

type InsightCard = {
  id: string;
  title: string;
  subtitle: string;
  value: number;
  suffix?: string;
  change: number;
  series: Array<{ index: number; value: number }>;
};

const INITIAL_METRICS: DashboardMetrics = {
  users: 0,
  students: 0,
  teachers: 0,
  admins: 0,
  nonTeaching: 0,
  buildings: 0,
  subjects: 0,
  sections: 0,
  schedules: 0,
  announcements: 0,
  studyLoad: 0,
};

const DashboardOverview = () => {
  const { theme } = useTheme();
  const [metrics, setMetrics] = useState<DashboardMetrics>(INITIAL_METRICS);
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState(() => getActiveUsersSnapshot());
  const [schoolYearInput, setSchoolYearInput] = useState(() => {
    const now = new Date().getFullYear();
    return `${now}-${now + 1}`;
  });

  const tooltipStyle = useMemo(
    () =>
      theme === "dark"
        ? {
            background: "#111827",
            border: "1px solid #253044",
            borderRadius: "12px",
            color: "#e5ebff",
          }
        : {
            background: "#ffffff",
            border: "1px solid #dce2f3",
            borderRadius: "12px",
            color: "#1e293b",
          },
    [theme],
  );

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToActiveUsers((snapshot) => {
      setActiveUsers(snapshot);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const statsData = await AdminAPI.getDashboardStats().catch(() => null);

      if (statsData && typeof statsData === "object" && statsData.users !== undefined) {
        const buildingsCount = Array.isArray(statsData.buildings)
          ? statsData.buildings.length
          : Number(statsData.buildings || 0);

        setMetrics({
          users: Number(statsData.users || 0),
          students: Number(statsData.students || 0),
          teachers: Number(statsData.teachers || 0),
          admins: Number(statsData.admins || 0),
          nonTeaching: Number(statsData.non_teaching || 0),
          buildings: Number(buildingsCount || 0),
          subjects: Number(statsData.subjects || 0),
          sections: Number(statsData.sections || 0),
          schedules: Number(statsData.schedules || 0),
          announcements: Number(statsData.announcements || 0),
          studyLoad: Number(statsData.study_load || 0),
        });
        return;
      }

      const [users, buildings, subjects] = await Promise.all([
        AdminAPI.getUsers().catch(() => []),
        AdminAPI.getBuildings().catch(() => []),
        AdminAPI.getSubjects().catch(() => []),
      ]);

      const safeUsers = Array.isArray(users) ? users : [];
      const roleCounts = { students: 0, teachers: 0, admins: 0, nonTeaching: 0 };
      safeUsers.forEach((user) => {
        const role = String(user?.role || "").trim().toLowerCase();
        if (role === "student") roleCounts.students += 1;
        if (role === "teacher") roleCounts.teachers += 1;
        if (role === "admin") roleCounts.admins += 1;
        if (role === "nt") roleCounts.nonTeaching += 1;
      });

      setMetrics({
        users: safeUsers.length,
        students: roleCounts.students,
        teachers: roleCounts.teachers,
        admins: roleCounts.admins,
        nonTeaching: roleCounts.nonTeaching,
        buildings: Array.isArray(buildings) ? buildings.length : 0,
        subjects: Array.isArray(subjects) ? subjects.length : 0,
        sections: 0,
        schedules: 0,
        announcements: 0,
        studyLoad: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const insightCards = useMemo<InsightCard[]>(() => {
    const enrollmentGrowth = Number(
      (((metrics.students - metrics.teachers * 24) / Math.max(metrics.students, 1)) * 100).toFixed(2),
    );
    const facultyCoverage = Number(
      (((metrics.teachers / Math.max(metrics.subjects, 1)) * 100) / 8).toFixed(2),
    );
    const loadDelta = Number(
      (((metrics.studyLoad - metrics.sections * 5) / Math.max(metrics.studyLoad || metrics.sections, 1)) * 100).toFixed(2),
    );

    const makeSeries = (base: number, slope: number, amplitude: number) =>
      ["P1", "P2", "P3", "P4", "P5", "P6", "P7"].map((_, index) => ({
        index,
        value: Number((base + index * slope + Math.sin(index * 0.7) * amplitude).toFixed(2)),
      }));

    return [
      {
        id: "enrollment",
        title: "Student Enrollment",
        subtitle: "Current enrolled students",
        value: metrics.students,
        change: enrollmentGrowth,
        series: makeSeries(metrics.students * 0.82, metrics.students * 0.03, metrics.students * 0.015),
      },
      {
        id: "faculty",
        title: "Faculty Coverage",
        subtitle: "Active teaching staff",
        value: metrics.teachers,
        change: facultyCoverage,
        series: makeSeries(metrics.teachers * 0.85, metrics.teachers * 0.02, metrics.teachers * 0.01),
      },
      {
        id: "study_load",
        title: "Academic Load",
        subtitle: "Total study load entries",
        value: metrics.studyLoad,
        change: loadDelta,
        series: makeSeries(
          Math.max(metrics.studyLoad * 0.8, 1),
          Math.max(metrics.studyLoad * 0.025, 0.5),
          Math.max(metrics.studyLoad * 0.012, 0.4),
        ),
      },
    ];
  }, [metrics]);

  const operationsSummary = useMemo(() => {
    const studentTeacherRatio = Number(
      (metrics.students / Math.max(metrics.teachers, 1)).toFixed(1),
    );
    const sectionCapacityTarget = Math.max(metrics.sections * 40, 1);
    const sectionUtilization = Number(
      Math.min(100, (metrics.students / sectionCapacityTarget) * 100).toFixed(1),
    );
    const scheduleDensity = Number(
      (metrics.schedules / Math.max(metrics.sections, 1)).toFixed(1),
    );

    return {
      studentTeacherRatio,
      sectionUtilization,
      scheduleDensity,
    };
  }, [metrics]);

  const operationsSeries = useMemo(() => {
    const studentsBase = Math.max(metrics.students, 1);
    const teachersBase = Math.max(metrics.teachers, 1);

    return ["W1", "W2", "W3", "W4", "W5", "W6", "W7"].map((label, index) => ({
      label,
      students: Math.round(studentsBase * (0.9 + index * 0.018) + Math.sin(index * 0.65) * 6),
      teachers: Math.round(teachersBase * (0.94 + index * 0.012) + Math.cos(index * 0.6) * 2),
    }));
  }, [metrics.students, metrics.teachers]);

  const riskTone =
    operationsSummary.sectionUtilization > 90
      ? "red"
      : operationsSummary.sectionUtilization > 75
        ? "yellow"
        : "green";

  if (loading) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <OverviewSurface>
      <OverviewHead>
        <HeadCopy>
          <Eyebrow>School Portal Analytics</Eyebrow>
          <h2>Overview Dashboard</h2>
          <p>
            Modern school analytics view with enrollment trends, staffing coverage, and operational
            projections.
          </p>
        </HeadCopy>

        <RefreshButton type="button" onClick={fetchDashboardMetrics}>
          <RefreshCw size={16} />
          Refresh
        </RefreshButton>
      </OverviewHead>

      <OverviewGrid>
        <PrimaryColumn>
          <Card>
            <CardHeader>
              <div>
                <h3>Top School Insights</h3>
                <p>Live indicators for students, teachers, and academic load.</p>
              </div>
            </CardHeader>

            <InsightGrid>
              {insightCards.map((card) => {
                const rising = card.change >= 0;
                return (
                  <InsightCardWrap key={card.id}>
                    <InsightTop>
                      <div>
                        <InsightName>{card.title}</InsightName>
                        <InsightSub>{card.subtitle}</InsightSub>
                      </div>
                      <TrendBadge $up={rising}>
                        {rising ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {rising ? "+" : ""}
                        {card.change.toFixed(2)}%
                      </TrendBadge>
                    </InsightTop>

                    <InsightValue>{card.value.toLocaleString()}</InsightValue>
                    <ValueHint>Current Count</ValueHint>

                    <ChartWrap>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={card.series}>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={rising ? "var(--dash-success)" : "var(--dash-danger)"}
                            strokeWidth={2.4}
                            dot={false}
                            activeDot={{
                              r: 4,
                              fill: "var(--dash-accent)",
                              stroke: "var(--dash-surface)",
                              strokeWidth: 2,
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartWrap>
                  </InsightCardWrap>
                );
              })}
            </InsightGrid>
          </Card>

          <BottomGrid>
            <Card>
              <CardHeader>
                <div>
                  <h3>Active Campus Operations</h3>
                  <p>Students vs teachers trend and utilization indicators.</p>
                </div>
              </CardHeader>

              <OperationTop>
                <div>
                  <OperationName>Current School Year</OperationName>
                  <OperationSub>{schoolYearInput}</OperationSub>
                </div>
                <OperationValue>{metrics.users.toLocaleString()} total users</OperationValue>
              </OperationTop>

              <StatRow>
                <StatPill>
                  <Users size={14} />
                  <span>Students: {metrics.students.toLocaleString()}</span>
                </StatPill>
                <StatPill>
                  <GraduationCap size={14} />
                  <span>Teachers: {metrics.teachers.toLocaleString()}</span>
                </StatPill>
                <StatPill>
                  <Percent size={14} />
                  <span>Section Utilization: {operationsSummary.sectionUtilization.toFixed(1)}%</span>
                </StatPill>
              </StatRow>

              <OperationChartWrap>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={operationsSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--dash-border)" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="students"
                      stroke="var(--dash-success)"
                      strokeWidth={2.2}
                      dot={false}
                      activeDot={{ r: 4, fill: "var(--dash-accent)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="teachers"
                      stroke="var(--dash-danger)"
                      strokeWidth={1.9}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </OperationChartWrap>

              <ActionRow>
                <GhostActionButton type="button">Manage Users</GhostActionButton>
                <AccentActionButton type="button">Open Study Load</AccentActionButton>
              </ActionRow>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <h3>Realtime Active Users</h3>
                  <p>How many users are currently online on the website.</p>
                </div>
              </CardHeader>

              <PeriodHead>
                <span>
                  Online Now
                  <strong>{activeUsers.total.toLocaleString()} User{activeUsers.total === 1 ? "" : "s"}</strong>
                </span>
                <Activity size={16} />
              </PeriodHead>

              <MetricGrid>
                <MetricCard>
                  <label>Active Session Count</label>
                  <strong>{activeUsers.total.toLocaleString()}</strong>
                </MetricCard>
              </MetricGrid>

              <OnlineList>
                {activeUsers.users.length === 0 ? (
                  <OnlineEmpty>No active users right now.</OnlineEmpty>
                ) : (
                  activeUsers.users.slice(0, 8).map((onlineUser) => (
                    <OnlineRow key={`${onlineUser.user_id || onlineUser.key}`}>
                      <span>
                        {onlineUser.full_name || onlineUser.username || `User ${onlineUser.user_id || ""}`}
                      </span>
                      <strong>{String(onlineUser.role || "user").toUpperCase()}</strong>
                    </OnlineRow>
                  ))
                )}
              </OnlineList>
            </Card>
          </BottomGrid>
        </PrimaryColumn>

        <AsideColumn>
          <SchoolPortfolioCard>
            <PortfolioGlow />
            <PortfolioHeader>
              <h3>School Performance Portfolio</h3>
              <p>Quick planning actions and semester summary snapshot.</p>
            </PortfolioHeader>

            <PortfolioButton type="button">
              <School size={16} />
              Generate Report
            </PortfolioButton>

            <PortfolioInput
              type="text"
              placeholder="Enter school year (2025-2026)"
              value={schoolYearInput}
              onChange={(event) => setSchoolYearInput(event.target.value)}
            />

            <PortfolioStats>
              <li>
                <span>Buildings</span>
                <strong>{metrics.buildings.toLocaleString()}</strong>
              </li>
              <li>
                <span>Subjects</span>
                <strong>{metrics.subjects.toLocaleString()}</strong>
              </li>
              <li>
                <span>Announcements</span>
                <strong>{metrics.announcements.toLocaleString()}</strong>
              </li>
            </PortfolioStats>
          </SchoolPortfolioCard>

          <SideCard>
            <CardHeader>
              <div>
                <h3>Risk & Reward Signals</h3>
                <p>School operation health flags for quick action.</p>
              </div>
            </CardHeader>

            <SignalList>
              <SignalRow $tone="green">
                <ShieldCheck size={15} />
                <div>
                  <strong>General</strong>
                  <span>
                    Student-to-teacher ratio is {operationsSummary.studentTeacherRatio.toFixed(1)}:1.
                  </span>
                </div>
              </SignalRow>

              <SignalRow $tone="yellow">
                <Sparkles size={15} />
                <div>
                  <strong>Academic Load</strong>
                  <span>
                    {metrics.studyLoad.toLocaleString()} study-load records across{" "}
                    {metrics.sections.toLocaleString()} sections.
                  </span>
                </div>
              </SignalRow>

              <SignalRow $tone={riskTone}>
                <TrendingUp size={15} />
                <div>
                  <strong>Capacity Alert</strong>
                  <span>
                    Section utilization at {operationsSummary.sectionUtilization.toFixed(1)}% with
                    schedule density {operationsSummary.scheduleDensity.toFixed(1)}.
                  </span>
                </div>
              </SignalRow>
            </SignalList>
          </SideCard>
        </AsideColumn>
      </OverviewGrid>
    </OverviewSurface>
  );
};

const OverviewSurface = styled.section`
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  --dash-bg: #f9fbff;
  --dash-surface: #ffffff;
  --dash-surface-soft: #f2f5ff;
  --dash-border: #dce2f3;
  --dash-title: #101728;
  --dash-text: #42506c;
  --dash-muted: #7a8398;
  --dash-accent: #6f5af8;
  --dash-accent-strong: #8c5dff;
  --dash-success: #00c853;
  --dash-danger: #ff5252;
  --dash-warning: #ffc107;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.15);

  background:
    radial-gradient(780px 260px at -6% -24%, rgba(111, 90, 248, 0.15), transparent 60%),
    radial-gradient(760px 260px at 102% -26%, rgba(0, 200, 83, 0.08), transparent 62%),
    var(--dash-bg);
  border: 1px solid var(--dash-border);
  border-radius: var(--radius-xl);
  padding: var(--space-md);
  color: var(--dash-text);
  box-shadow: var(--shadow-sm);

  [data-theme="dark"] & {
    --dash-bg: #0f1521;
    --dash-surface: #131a26;
    --dash-surface-soft: #171f2d;
    --dash-border: #253044;
    --dash-title: #f5f8ff;
    --dash-text: #c1cae0;
    --dash-muted: #8f9ab5;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.45);
    --shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.5);
  }

  @media (min-width: 640px) {
    padding: var(--space-lg);
  }

  @media (min-width: 768px) {
    padding: var(--space-lg);
  }

  @media (min-width: 1024px) {
    padding: var(--space-xl);
  }

  @media (min-width: 1536px) {
    max-width: 1480px;
  }
`;

const OverviewHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
  margin-bottom: var(--space-lg);
`;

const HeadCopy = styled.div`
  h2 {
    margin: 8px 0 6px;
    color: var(--dash-title);
    font-size: clamp(1.25rem, 2.3vw, 1.8rem);
    font-weight: 800;
    line-height: 1.2;
  }

  p {
    margin: 0;
    color: var(--dash-muted);
    font-size: 0.9rem;
    max-width: 640px;
  }
`;

const Eyebrow = styled.span`
  display: inline-block;
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--dash-accent);
  font-weight: 700;
`;

const RefreshButton = styled.button`
  border: 1px solid var(--dash-border);
  background: var(--dash-surface);
  color: var(--dash-text);
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;
  box-shadow: var(--shadow-sm);
`;

const OverviewGrid = styled.div`
  display: grid;
  gap: var(--space-md);

  @media (min-width: 640px) {
    gap: var(--space-lg);
  }

  @media (min-width: 1280px) {
    grid-template-columns: minmax(0, 1.65fr) minmax(320px, 1fr);
    align-items: start;
  }
`;

const PrimaryColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-md);

  @media (min-width: 640px) {
    gap: var(--space-lg);
  }
`;

const AsideColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-md);

  @media (min-width: 640px) {
    gap: var(--space-lg);
  }
`;

const Card = styled.article`
  background: var(--dash-surface);
  border: 1px solid var(--dash-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  box-shadow: var(--shadow-md);

  @media (min-width: 768px) {
    padding: var(--space-lg);
  }
`;

const SideCard = styled(Card)``;

const CardHeader = styled.div`
  margin-bottom: var(--space-md);

  h3 {
    margin: 0;
    color: var(--dash-title);
    font-size: 1.04rem;
    font-weight: 700;
  }

  p {
    margin: 6px 0 0;
    color: var(--dash-muted);
    font-size: 0.82rem;
  }
`;

const InsightGrid = styled.div`
  display: grid;
  gap: var(--space-md);

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const InsightCardWrap = styled.div`
  border-radius: var(--radius-lg);
  border: 1px solid var(--dash-border);
  background: var(--dash-surface-soft);
  padding: var(--space-md);
  box-shadow: var(--shadow-sm);
`;

const InsightTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
`;

const InsightName = styled.h4`
  margin: 0;
  color: var(--dash-title);
  font-size: 0.96rem;
  font-weight: 700;
`;

const InsightSub = styled.p`
  margin: 4px 0 0;
  color: var(--dash-muted);
  font-size: 0.75rem;
`;

const TrendBadge = styled.span`
  border-radius: 999px;
  padding: 4px 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  color: ${(props) => (props.$up ? "var(--dash-success)" : "var(--dash-danger)")};
  background: ${(props) =>
    props.$up ? "rgba(0, 200, 83, 0.12)" : "rgba(255, 82, 82, 0.12)"};
`;

const InsightValue = styled.strong`
  display: block;
  margin-top: var(--space-md);
  color: var(--dash-title);
  font-size: 1.56rem;
  font-weight: 800;
  text-shadow: 0 0 20px rgba(111, 90, 248, 0.22);
`;

const ValueHint = styled.span`
  color: var(--dash-muted);
  font-size: 0.75rem;
  font-weight: 500;
`;

const ChartWrap = styled.div`
  margin-top: var(--space-sm);
  height: 96px;
`;

const BottomGrid = styled.div`
  display: grid;
  gap: var(--space-md);

  @media (min-width: 768px) {
    grid-template-columns: 1.2fr 1fr;
    gap: var(--space-lg);
  }
`;

const OperationTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
`;

const OperationName = styled.h4`
  margin: 0;
  color: var(--dash-title);
  font-size: 1rem;
  font-weight: 700;
`;

const OperationSub = styled.p`
  margin: 4px 0 0;
  color: var(--dash-muted);
  font-size: 0.76rem;
`;

const OperationValue = styled.strong`
  font-size: 1.1rem;
  color: var(--dash-title);
  font-weight: 800;
  text-shadow: 0 0 18px rgba(111, 90, 248, 0.22);
`;

const StatRow = styled.div`
  margin-top: var(--space-md);
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-sm);

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const StatPill = styled.div`
  border-radius: 12px;
  border: 1px solid var(--dash-border);
  background: var(--dash-surface-soft);
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--dash-text);
  font-size: 0.76rem;
  font-weight: 600;
`;

const OperationChartWrap = styled.div`
  margin-top: var(--space-md);
  height: 170px;
`;

const ActionRow = styled.div`
  margin-top: var(--space-md);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
`;

const GhostActionButton = styled.button`
  border: 1px solid var(--dash-border);
  background: var(--dash-surface-soft);
  color: var(--dash-title);
  border-radius: 12px;
  height: 38px;
  padding: 0 14px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
`;

const AccentActionButton = styled.button`
  border: 1px solid rgba(111, 90, 248, 0.42);
  background: rgba(111, 90, 248, 0.12);
  color: var(--dash-accent);
  border-radius: 12px;
  height: 38px;
  padding: 0 14px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
`;

const PeriodHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  color: var(--dash-text);
  font-size: 0.78rem;
  font-weight: 600;

  strong {
    margin-left: 8px;
    color: var(--dash-title);
    font-size: 0.96rem;
  }
`;

const SliderWrap = styled.div`
  margin-top: var(--space-md);

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 999px !important;
    background: color-mix(in srgb, var(--dash-accent) 24%, var(--dash-border));
    border: 0 !important;
    padding: 0 !important;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--dash-accent), var(--dash-accent-strong));
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 6px rgba(111, 90, 248, 0.15);
  }
`;

const SliderMarks = styled.div`
  margin-top: var(--space-sm);
  display: flex;
  justify-content: space-between;
  color: var(--dash-muted);
  font-size: 0.7rem;
  font-weight: 600;
`;

const ProgressTrack = styled.div`
  margin-top: var(--space-md);
  border-radius: 999px;
  height: 7px;
  background: color-mix(in srgb, var(--dash-accent) 20%, var(--dash-border));
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--dash-accent), var(--dash-accent-strong));
  transition: width 0.2s ease;
`;

const MetricGrid = styled.div`
  margin-top: var(--space-md);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-sm);
`;

const MetricCard = styled.div`
  border-radius: 12px;
  border: 1px solid var(--dash-border);
  background: var(--dash-surface-soft);
  padding: 10px;
  min-height: 74px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;

  label {
    color: var(--dash-muted);
    font-size: 0.72rem;
    font-weight: 600;
  }

  strong {
    color: var(--dash-title);
    font-size: 0.88rem;
    font-weight: 700;
  }
`;

const OnlineList = styled.div`
  margin-top: var(--space-sm);
  border: 1px solid var(--dash-border);
  border-radius: 12px;
  overflow: hidden;
`;

const OnlineRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: 10px 12px;
  border-top: 1px solid var(--dash-border);

  &:first-child {
    border-top: 0;
  }

  span {
    color: var(--dash-text);
    font-size: 0.84rem;
    font-weight: 600;
  }

  strong {
    color: var(--dash-title);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
  }
`;

const OnlineEmpty = styled.div`
  padding: 12px;
  color: var(--dash-muted);
  font-size: 0.82rem;
`;

const SchoolPortfolioCard = styled.article`
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.22);
  padding: var(--space-lg);
  background: linear-gradient(155deg, #6f5af8 0%, #8c5dff 65%, #5a6cff 100%);
  color: #ffffff;
  box-shadow: var(--shadow-lg);
`;

const PortfolioGlow = styled.div`
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  right: -56px;
  top: -72px;
  background: rgba(255, 255, 255, 0.18);
  filter: blur(2px);
`;

const PortfolioHeader = styled.div`
  position: relative;

  h3 {
    margin: 0;
    color: #ffffff;
    font-size: 1.08rem;
    font-weight: 700;
  }

  p {
    margin: 8px 0 0;
    color: rgba(255, 255, 255, 0.88);
    font-size: 0.8rem;
    line-height: 1.4;
  }
`;

const PortfolioButton = styled.button`
  margin-top: var(--space-md);
  height: 40px;
  width: 100%;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
`;

const PortfolioInput = styled.input`
  margin-top: var(--space-sm);
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.26) !important;
  background: rgba(13, 17, 23, 0.18) !important;
  color: #ffffff !important;
  font-size: 0.8rem !important;
  padding: 10px 12px !important;
`;

const PortfolioStats = styled.ul`
  margin: var(--space-md) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li {
    border-radius: 12px;
    padding: 10px;
    background: rgba(13, 17, 23, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.16);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  span {
    font-size: 0.76rem;
    color: rgba(255, 255, 255, 0.86);
  }

  strong {
    font-size: 0.82rem;
    font-weight: 700;
    color: #ffffff;
  }
`;

const SignalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
`;

const SignalRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  border-radius: 12px;
  border: 1px solid var(--dash-border);
  background: var(--dash-surface-soft);
  padding: 10px;
  color: ${(props) =>
    props.$tone === "green"
      ? "var(--dash-success)"
      : props.$tone === "red"
        ? "var(--dash-danger)"
        : "var(--dash-warning)"};

  div {
    display: flex;
    flex-direction: column;
    gap: 3px;
    color: var(--dash-text);
  }

  strong {
    color: var(--dash-title);
    font-size: 0.83rem;
    font-weight: 700;
  }

  span {
    color: var(--dash-muted);
    font-size: 0.74rem;
    line-height: 1.3;
  }
`;

export default DashboardOverview;
