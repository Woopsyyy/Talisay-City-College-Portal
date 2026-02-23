import React, { useState, useEffect, useMemo } from "react";
import baseStyled, { createGlobalStyle } from "styled-components";
import { StudentAPI } from "../../../services/api";
import {
  BookOpen,
  Calendar,
  Award,
  GraduationCap,
  User,
  X,
  Eye,
  Download,
} from "lucide-react";
import PageSkeleton from "../../loaders/PageSkeleton";
const styled = baseStyled as any;

const GradesView = ({ currentUser }) => {
  const [gradesByYear, setGradesByYear] = useState({});
  const [studyLoad, setStudyLoad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [printingSem, setPrintingSem] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeSemester, setActiveSemester] = useState("1st Semester");

  const formatGender = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "-";
    const normalized = raw.toLowerCase();
    if (normalized === "m" || normalized === "male") return "Male";
    if (normalized === "f" || normalized === "female") return "Female";
    if (normalized === "lgbtqia++") return "LGBTQIA++";
    if (normalized === "prefer not to say") return "Prefer not to say";
    return raw;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gradesData, studyLoadData, assignmentData] = await Promise.all([
        StudentAPI.getGrades().catch((err) => {
          console.error("Grades fetch error:", err);
          return [];
        }),
        StudentAPI.getStudyLoad("all").catch((err) => {
          console.error("Study load fetch error:", err);
          return [];
        }),
        StudentAPI.getAssignment().catch((err) => {
          console.error("Assignment fetch error:", err);
          return null;
        }),
      ]);

      console.log("Debug - Study Load Received:", studyLoadData);
      console.log("Debug - Assignment Received:", assignmentData);

      const sLoad = Array.isArray(studyLoadData)
        ? studyLoadData
        : studyLoadData
          ? [studyLoadData]
          : [];
      setStudyLoad(sLoad);

      const assign =
        Array.isArray(assignmentData) && assignmentData.length > 0
          ? assignmentData[0]
          : assignmentData;
      setAssignment(assign);

      const grouped = {};
      (Array.isArray(gradesData) ? gradesData : []).forEach((grade) => {
        const year = grade.year || "unknown";
        if (!grouped[year]) {
          grouped[year] = {
            label: normalizeYear(year),
            subjects: [],
          };
        }
        grouped[year].subjects.push(grade);
      });
      setGradesByYear(grouped);
    } catch (err) {
      console.error("fetchData overall error:", err);
      setError(err.message || "Failed to load academic records");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (sem) => {
    setPrintingSem(sem);
    setTimeout(() => {
      window.print();
      setPrintingSem(null);
    }, 500);
  };

  const formatOrdinal = (value) => {
    const number = parseInt(String(value), 10);
    if (number <= 0) return "";
    const suffixes = [
      "th",
      "st",
      "nd",
      "rd",
      "th",
      "th",
      "th",
      "th",
      "th",
      "th",
    ];
    const mod100 = number % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
    return number + (suffixes[number % 10] || "th");
  };

  const normalizeYear = (value) => {
    const raw = String(value || "").trim();
    if (raw === "unknown" || raw === "") return "Academic Records";
    if (raw.toLowerCase().includes("year")) return raw;
    if (!Number.isNaN(Number(raw))) {
      const num = parseInt(raw);
      if (num > 0 && num <= 10) return formatOrdinal(num) + " Year";
    }
    return raw;
  };

  const normalizeSemester = (value) => {
    const raw = String(value || "")
      .trim()
      .toLowerCase();
    if (raw === "") return "N/A";
    if (raw.includes("1") || raw.includes("first")) return "1st Semester";
    if (raw.includes("2") || raw.includes("second")) return "2nd Semester";
    if (raw.includes("summer")) return "Summer";
    return raw;
  };

  const preferredYearOrder = ["1", "2", "3", "4"];
  const orderedYearKeys = useMemo(
    () =>
      Object.keys(gradesByYear).sort((a, b) => {
        const indexA = preferredYearOrder.indexOf(a);
        const indexB = preferredYearOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      }),
    [gradesByYear, preferredYearOrder],
  );

  const firstSemSubjects = useMemo(
    () =>
      studyLoad.filter((s) => normalizeSemester(s.semester) === "1st Semester"),
    [studyLoad],
  );
  const secondSemSubjects = useMemo(
    () =>
      studyLoad.filter((s) => normalizeSemester(s.semester) === "2nd Semester"),
    [studyLoad],
  );
  const otherSubjects = useMemo(
    () =>
      studyLoad.filter((s) => {
        const normalized = normalizeSemester(s.semester);
        return normalized !== "1st Semester" && normalized !== "2nd Semester";
      }),
    [studyLoad],
  );

  const displayGender = useMemo(
    () =>
      formatGender(
        assignment?.gender || currentUser?.gender || currentUser?.sex,
      ),
    [assignment?.gender, currentUser?.gender, currentUser?.sex],
  );

  const displayStudentId = useMemo(() => {
    const preferred = assignment?.school_id || currentUser?.school_id;
    if (preferred != null && String(preferred).trim()) return String(preferred);
    if (currentUser?.username != null && String(currentUser.username).trim()) {
      return String(currentUser.username);
    }
    if (currentUser?.id != null && String(currentUser.id).trim()) {
      return String(currentUser.id);
    }
    return "N/A";
  }, [assignment?.school_id, currentUser?.school_id, currentUser?.username, currentUser?.id]);

  const displayCourseProgram = useMemo(() => {
    const department = String(
      assignment?.department || assignment?.section_course || "",
    ).trim();
    const major = String(assignment?.major || "").trim();

    if (department && major) {
      const depLower = department.toLowerCase();
      const majorLower = major.toLowerCase();
      if (!depLower.includes(majorLower)) return `${department} - ${major}`;
      return department;
    }

    if (major) return major;
    if (department) return department;
    return "N/A";
  }, [assignment?.department, assignment?.section_course, assignment?.major]);

  console.log("Subjects Categorized:", {
    total: studyLoad.length,
    first: firstSemSubjects.length,
    second: secondSemSubjects.length,
    other: otherSubjects.length,
  });

  const renderSubjectTable = (subjects, validSem, title) => (
    <div
      className={`printable-section studyload-print-table-wrap ${printingSem && printingSem !== validSem ? "hidden-print" : ""}`}
    >
      <TableHeader className="no-print">
        <SectionHeader>{title}</SectionHeader>
        <PremiumDownloadButton
          onClick={() => handleDownload(validSem)}
          disabled={subjects.length === 0}
        >
          <Download size={18} /> Download {title}
        </PremiumDownloadButton>
      </TableHeader>

      <SubjectTable className="studyload-print-table">
        <thead>
          <tr>
            <th style={{ width: "120px" }}>Subject Code</th>
            <th>Descriptive Title</th>
            <th style={{ width: "80px", textAlign: "center" }}>Units</th>
          </tr>
        </thead>
        <tbody>
          {subjects.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center empty">
                No subjects enrolled for this semester.
              </td>
            </tr>
          ) : (
            subjects.map((sub, idx) => (
              <tr key={idx}>
                <td>
                  <CodeBadge>{sub.subject_code}</CodeBadge>
                </td>
                <td className="subject-title-cell">{sub.subject_title}</td>
                <td style={{ textAlign: "center" }}>
                  <strong>{sub.units}</strong>
                </td>
              </tr>
            ))
          )}
          {subjects.length > 0 && (
            <TotalRowPrint>
              <td
                colSpan={2}
                style={{ textAlign: "right", paddingRight: "2rem" }}
              >
                <strong>TOTAL UNITS ENROLLED:</strong>
              </td>
              <td style={{ textAlign: "center" }}>
                <strong>
                  {subjects.reduce(
                    (sum, s) => sum + parseFloat(s.units || 0),
                    0,
                  )}
                </strong>
              </td>
            </TotalRowPrint>
          )}
        </tbody>
      </SubjectTable>
    </div>
  );

  if (loading) return <PageSkeleton variant="table" columns={3} />;

  if (error)
    return (
      <Container>
        <div className="alert alert-danger">Error loading grades: {error}</div>
      </Container>
    );

  return (
    <Container>
      <StudyLoadGlobalPrintStyles />
      <Header>
        <h2>Academic Records</h2>
        <p>Track your grades and enrollment status</p>
      </Header>

      <SemesterSwitchWrap>
        <SemesterSwitchLabel>Show Subjects For</SemesterSwitchLabel>
        <SemesterSwitchButtons>
          <SemesterSwitchButton
            type="button"
            $active={activeSemester === "1st Semester"}
            onClick={() => setActiveSemester("1st Semester")}
          >
            1st Semester
          </SemesterSwitchButton>
          <SemesterSwitchButton
            type="button"
            $active={activeSemester === "2nd Semester"}
            onClick={() => setActiveSemester("2nd Semester")}
          >
            2nd Semester
          </SemesterSwitchButton>
        </SemesterSwitchButtons>
      </SemesterSwitchWrap>

      {orderedYearKeys.length === 0 ? (
        <EmptyGroup>
          <Award size={48} />
          <p>No academic records found.</p>
        </EmptyGroup>
      ) : (
        orderedYearKeys.map((yearKey) => {
          const yearData = gradesByYear[yearKey];
          const semesterSubjects = (yearData?.subjects || []).filter(
            (grade) => normalizeSemester(grade?.semester) === activeSemester,
          );

          if (semesterSubjects.length === 0) return null;

          return (
            <YearGroup key={yearKey}>
              <YearTitle>
                <Calendar size={20} /> {yearData.label} - {activeSemester}
              </YearTitle>

              <SubjectGrid>
                {semesterSubjects.map((grade, idx) => (
                  <SubjectCard
                    key={idx}
                    onClick={() => setSelectedSubject(grade)}
                  >
                    <CardIcon>
                      <BookOpen size={24} />
                    </CardIcon>
                    <CardContent>
                      <SubjectCode>{grade.subject_code || "SUBJ"}</SubjectCode>
                      <SubjectTitle>
                        {grade.subject || "Unknown Subject"}
                      </SubjectTitle>
                      <ViewButton>
                        <Eye size={14} /> View Grades
                      </ViewButton>
                    </CardContent>
                  </SubjectCard>
                ))}
              </SubjectGrid>
            </YearGroup>
          );
        })
      )}

      {orderedYearKeys.length > 0 &&
        orderedYearKeys.every((yearKey) => {
          const yearData = gradesByYear[yearKey];
          const semesterSubjects = (yearData?.subjects || []).filter(
            (grade) => normalizeSemester(grade?.semester) === activeSemester,
          );
          return semesterSubjects.length === 0;
        }) && (
          <EmptyGroup>
            <Award size={48} />
            <p>No grades found for {activeSemester}.</p>
          </EmptyGroup>
        )}

      {/* Study Load - Redesigned Business Style */}
      <PrintStyles>
        <StudyLoadHeader className="no-print">
          <SectionTitle style={{ marginTop: "4rem" }}>
            <GraduationCap size={24} /> Study Load Management
          </SectionTitle>
          <HeaderLogo>
            <img
              loading="lazy"
              src="/images/tcc-logo.png"
              alt="TCC Logo"
              onError={(e) => {
                const image = e.currentTarget as HTMLImageElement;
                image.style.display = "none";
              }}
            />
          </HeaderLogo>
        </StudyLoadHeader>

        <PrintContainer id="study-load-printable">
          <PrintHeader className="studyload-print-header">
            <LogoSection>
              <img
                loading="lazy"
                src="/images/tcc-logo.png"
                alt="TCC Logo"
                onError={(e) => {
                  const image = e.currentTarget as HTMLImageElement;
                  image.style.display = "none";
                }}
              />
            </LogoSection>
            <HeaderText>
              <h1>Talisay City College</h1>
              <p>Poblacion, Talisay City, Cebu, Philippines 6045</p>
              <p>Tel. No. (032) 272-6804</p>
              <h3>Office of the Registrar</h3>
            </HeaderText>
          </PrintHeader>

          <DocumentTitleSection className="studyload-print-title">
            <h2>CERTIFICATE OF ENROLLMENT (STUDY LOAD)</h2>
          </DocumentTitleSection>

          <InfoGridPrint className="studyload-print-info">
            <InfoLine className="studyload-print-line studyload-line-top">
              <InfoInlineItem className="studyload-inline-item">
                <strong>STUDENT NAME:</strong>
                <span>{currentUser?.full_name || "N/A"}</span>
              </InfoInlineItem>
              <InfoInlineItem className="studyload-inline-item">
                <strong>GENDER:</strong>
                <span>{displayGender}</span>
              </InfoInlineItem>
              <InfoInlineItem className="studyload-inline-item">
                <strong>YEAR &amp; SECTION:</strong>
                <span>
                  {assignment?.year_level || assignment?.grade_level || "1"} -{" "}
                  {assignment?.section_full_name ||
                    assignment?.section_name ||
                    assignment?.section_code ||
                    "N/A"}
                </span>
              </InfoInlineItem>
              <InfoInlineItem className="studyload-inline-item studyload-student-id">
                <strong>STUDENT ID:</strong>
                <span>{displayStudentId}</span>
              </InfoInlineItem>
            </InfoLine>

            <InfoLine className="studyload-print-line studyload-line-bottom">
              <InfoInlineItem className="studyload-inline-item">
                <strong>COURSE / PROGRAM:</strong>
                <span>{displayCourseProgram}</span>
              </InfoInlineItem>
              <InfoInlineItem className="studyload-inline-item">
                <strong>ACADEMIC YEAR:</strong>
                <span>{assignment?.school_year || "2025-2026"}</span>
              </InfoInlineItem>
            </InfoLine>
          </InfoGridPrint>

          {/* Dynamic Tables */}
          {firstSemSubjects.length > 0 &&
            renderSubjectTable(
              firstSemSubjects,
              "1st Semester",
              "1ST SEMESTER STUDY LOAD",
            )}
          {secondSemSubjects.length > 0 &&
            renderSubjectTable(
              secondSemSubjects,
              "2nd Semester",
              "2ND SEMESTER STUDY LOAD",
            )}
          {otherSubjects.length > 0 &&
            renderSubjectTable(otherSubjects, "Other", "ADDITIONAL SUBJECTS")}

          {studyLoad.length === 0 && (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#666",
                fontStyle: "italic",
                background: "rgba(0,0,0,0.02)",
                borderRadius: "8px",
                border: "1px dashed #ddd",
              }}
            >
              <p>No study load subjects found for your current assignment.</p>
              <p style={{ fontSize: "0.8rem" }}>
                Check if your year level and section are correctly assigned.
              </p>
            </div>
          )}

          <SignatureSection className="studyload-print-signatures">
            <div className="sig-block">
              <div className="line"></div>
              <span>Student's Signature</span>
            </div>
            <div className="sig-block">
              <div className="line"></div>
              <span>Registrar's Signature</span>
            </div>
          </SignatureSection>

          <OfficialSeal className="studyload-print-seal">
            <p>NOT VALID WITHOUT OFFICIAL SEAL</p>
          </OfficialSeal>
        </PrintContainer>
      </PrintStyles>

      {}
      {selectedSubject && (
        <ModalOverlay onClick={() => setSelectedSubject(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <ModalTitle>{selectedSubject.subject}</ModalTitle>
                <ModalSubtitle>
                  {selectedSubject.subject_code} •{" "}
                  {normalizeSemester(selectedSubject.semester)}
                </ModalSubtitle>
              </div>
              <CloseButton onClick={() => setSelectedSubject(null)}>
                <X size={24} />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <GradeTable>
                <thead>
                  <tr>
                    <th>Term</th>
                    <th>Grade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Prelim</td>
                    <td>
                      <GradeValue>
                        {selectedSubject.prelim_grade || "—"}
                      </GradeValue>
                    </td>
                    <td>{getStatus(selectedSubject.prelim_grade)}</td>
                  </tr>
                  <tr>
                    <td>Midterm</td>
                    <td>
                      <GradeValue>
                        {selectedSubject.midterm_grade || "—"}
                      </GradeValue>
                    </td>
                    <td>{getStatus(selectedSubject.midterm_grade)}</td>
                  </tr>
                  <tr>
                    <td>Finals</td>
                    <td>
                      <GradeValue>
                        {selectedSubject.finals_grade || "—"}
                      </GradeValue>
                    </td>
                    <td>{getStatus(selectedSubject.finals_grade)}</td>
                  </tr>
                </tbody>
              </GradeTable>

              {selectedSubject.instructor && (
                <InstructorInfo>
                  <User size={16} />
                  Instructor: <strong>{selectedSubject.instructor}</strong>
                </InstructorInfo>
              )}
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

const getStatus = (grade) => {
  if (!grade) return <StatusBadge $type="pending">Pending</StatusBadge>;
  const g = parseFloat(grade);
  if (isNaN(g)) return <StatusBadge $type="neutral">{grade}</StatusBadge>;
  if (g <= 3.0) return <StatusBadge $type="pass">Passed</StatusBadge>;
  if (g > 3.0) return <StatusBadge $type="fail">Failed</StatusBadge>;
  return <StatusBadge $type="neutral">—</StatusBadge>;
};

const Container = styled.div`
  animation: fadeIn 0.4s ease-out;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 4rem;
`;

const Header = styled.div`
  margin-bottom: 2.5rem;
  h2 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }
  p {
    color: var(--text-secondary);
    font-size: 1.1rem;
  }
`;

const SemesterSwitchWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-secondary);
`;

const SemesterSwitchLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const SemesterSwitchButtons = styled.div`
  display: inline-flex;
  gap: 0.6rem;
  flex-wrap: wrap;
`;

const SemesterSwitchButton = styled.button`
  border: 1px solid
    ${(props) =>
      props.$active ? "var(--accent-primary)" : "var(--border-color)"};
  background: ${(props) =>
    props.$active ? "var(--accent-primary)" : "var(--bg-primary)"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--text-primary)")};
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-primary);
    transform: translateY(-1px);
  }
`;

const YearGroup = styled.div`
  margin-bottom: 3rem;
`;

const YearTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.4rem;
  color: var(--accent-primary);
  margin-bottom: 1.5rem;
`;

const SubjectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
`;

const SubjectCard = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  overflow: hidden;
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
    border-color: var(--accent-primary);
  }
  &:hover button {
    color: var(--accent-primary);
    background: var(--bg-tertiary);
  }
`;

const CardIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const SubjectCode = styled.span`
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
`;

const SubjectTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0.5rem 0;
  line-height: 1.4;
`;

const ViewButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  padding: 0.5rem 0;
  margin-top: auto;
  cursor: pointer;
  transition: color 0.2s;
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 3rem 0 1.5rem 0;
`;

const StudyLoadHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const HeaderLogo = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  img {
    width: 48px;
    height: 48px;
    object-fit: contain;
  }
`;

const Card = styled.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 12px;
  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
  }
  svg {
    color: var(--accent-primary);
  }
`;

const CardBody = styled.div`
  padding: 0;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: 1rem 1.5rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }
  th {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
  }
  td {
    color: var(--text-primary);
    font-size: 0.95rem;
  }
  tr:last-child td {
    border-bottom: none;
  }
`;

const Code = styled.span`
  font-family: monospace;
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  font-size: 0.85rem;
`;

const InstructorCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  svg {
    color: var(--text-secondary);
  }
`;

const TotalRow = styled.tr`
  background: var(--bg-tertiary);
  td {
    font-weight: 700;
    color: var(--text-primary);
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: var(--text-secondary);
`;

const EmptyGroup = styled(EmptyState)`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  svg {
    opacity: 0.5;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
  animation: fadeIn 0.2s;
`;

const ModalContent = styled.div`
  background: var(--bg-secondary);
  width: 90%;
  max-width: 500px;
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  @keyframes slideUp {
    from {
      transform: translateY(40px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
  line-height: 1.2;
`;
const ModalSubtitle = styled.p`
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  margin-left: 1rem;
  &:hover {
    color: var(--text-primary);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const GradeTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  th,
  td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }
  th {
    background: var(--bg-tertiary);
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
  tr:last-child td {
    border-bottom: none;
  }
`;

const GradeValue = styled.span`
  font-weight: 700;
  color: var(--text-primary);
  font-size: 1rem;
`;

const StatusBadge = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${(props) =>
    props.$type === "pass"
      ? "rgba(16, 185, 129, 0.1)"
      : props.$type === "fail"
        ? "rgba(239, 68, 68, 0.1)"
        : "var(--bg-tertiary)"};
  color: ${(props) =>
    props.$type === "pass"
      ? "#10b981"
      : props.$type === "fail"
        ? "#ef4444"
        : "var(--text-secondary)"};
`;

const InstructorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  strong {
    color: var(--text-primary);
  }
`;

/* Semester Selector Styled Components */

/* Modern Study Load Styled Components */
const StudyLoadContainer = styled.div`
  background: var(--bg-secondary);
  border-radius: 20px;
  border: 1px solid var(--border-color);
  padding: 2rem;
  box-shadow: var(--shadow-md);
  margin-top: 1rem;
  margin-bottom: 2rem;
`;

const InfoCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const InfoCard = styled.div`
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
    border-color: var(--accent-primary);
  }
`;

const InfoCardLabel = styled.div`
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  letter-spacing: 0.5px;
`;

const InfoCardValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  word-break: break-word;
`;

const AcademicDetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
`;

const AcademicDetailItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

const DetailIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  flex-shrink: 0;
`;

const DetailContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const DetailLabel = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
  letter-spacing: 0.5px;
`;

const DetailValue = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-word;
`;

const StatusPill = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  background: ${(props) =>
    props.$status === "Irregular"
      ? "rgba(251, 191, 36, 0.15)"
      : "rgba(34, 197, 94, 0.15)"};
  color: ${(props) => (props.$status === "Irregular" ? "#f59e0b" : "#22c55e")};
  border: 1px solid
    ${(props) =>
      props.$status === "Irregular"
        ? "rgba(251, 191, 36, 0.3)"
        : "rgba(34, 197, 94, 0.3)"};
`;

const SubjectsSection = styled.div`
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
`;

const SubjectsSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 1rem;

  h4 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;

    svg {
      color: var(--accent-primary);
    }
  }
`;

const SummaryBadges = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SummaryBadge = styled.div`
  background: var(--bg-secondary);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);

  span {
    margin-right: 0.25rem;
  }

  strong {
    color: var(--accent-primary);
    font-size: 1.1rem;
  }
`;

const ModernTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  thead {
    background: var(--bg-tertiary);

    th {
      padding: 1rem 1.5rem;
      text-align: left;
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
      color: var(--text-secondary);
      letter-spacing: 0.5px;
      border-bottom: 2px solid var(--border-color);
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid var(--border-color);
      transition: background 0.15s;

      &:hover {
        background: var(--bg-tertiary);
      }

      &:last-child {
        border-bottom: none;
      }

      td {
        padding: 1.25rem 1.5rem;
        color: var(--text-primary);
        font-size: 0.95rem;
      }
    }
  }
`;

const SubjectCodeBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: "Courier New", monospace;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-primary);
`;

const UnitsBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 50%;
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--accent-primary);
`;

const TotalRowPrint = styled.tr`
  background: #f8fafc;
  td {
    border-top: 2px solid #0f172a !important;
    border-bottom: none !important;
    padding: 1rem !important;
  }
`;

const PrintContainer = styled.div`
  background: white;
  padding: 4rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  color: #1a1a1a;
  font-family: "Inter", system-ui, sans-serif;
  border: 1px solid #eef0f2;
  position: relative;
  width: 80%;
  max-width: 980px;
  min-width: 720px;
  margin: 3rem auto;

  @media (max-width: 1024px) {
    width: 90%;
    min-width: 0;
    padding: 2rem;
  }

  @media print {
    box-shadow: none;
    padding: 0;
    border: none;
    max-width: 100%;
    margin: 0;
  }
`;

const PrintHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 3px double #0056b3;

  @media print {
    gap: 0.6rem;
    margin-bottom: 0.7rem;
    padding-bottom: 0.45rem;
    border-bottom-width: 1px;
  }
`;

const LogoSection = styled.div`
  background: #f8fafc;
  width: 90px;
  height: 90px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e2e8f0;

  img {
    width: 70px;
    height: 70px;
    object-fit: contain;
  }

  @media print {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border-width: 1px;
    img {
      width: 24px;
      height: 24px;
    }
  }
`;

const HeaderText = styled.div`
  h1 {
    font-size: 2rem;
    font-weight: 900;
    margin: 0;
    color: #003366;
    letter-spacing: -0.5px;
  }
  p {
    font-size: 0.85rem;
    color: #64748b;
    margin: 3px 0;
    font-weight: 600;
  }
  h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: 8px 0 0 0;
    color: #0056b3;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  @media print {
    h1 {
      font-size: 0.88rem;
      letter-spacing: 0;
    }
    p {
      font-size: 0.52rem;
      margin: 1px 0;
    }
    h3 {
      font-size: 0.56rem;
      margin-top: 3px;
      letter-spacing: 0.5px;
    }
  }
`;

const DocumentTitleSection = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  h2 {
    font-size: 1.6rem;
    font-weight: 900;
    color: #1e293b;
    margin: 0;
    border-bottom: 2px solid #334155;
    display: inline-block;
    padding-bottom: 5px;
  }

  @media print {
    margin-bottom: 0.65rem;
    h2 {
      font-size: 0.66rem;
      border-bottom-width: 1px;
      padding-bottom: 2px;
      letter-spacing: 0.3px;
    }
  }
`;

const InfoGridPrint = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 3rem;
  background: #f8fafc;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;

  @media print {
    gap: 0.2rem;
    margin-bottom: 0.28rem;
    padding: 0.28rem;
    border-radius: 4px;
    background: none;
    border: 1px solid #eef0f2;
  }
`;

const InfoLine = styled.div`
  display: grid;
  gap: 0.75rem;
  align-items: center;

  &.studyload-line-top {
    grid-template-columns:
      minmax(0, 2.1fr) minmax(0, 0.9fr) minmax(0, 1.7fr)
      minmax(0, 1.6fr);
  }

  &.studyload-line-bottom {
    grid-template-columns: minmax(0, 2.6fr) minmax(0, 1fr);
  }

  @media print {
    gap: 0.24rem;

    &.studyload-line-top {
      grid-template-columns:
        minmax(0, 2.1fr) minmax(0, 0.9fr) minmax(0, 1.7fr)
        minmax(0, 1.7fr);
    }

    &.studyload-line-bottom {
      grid-template-columns: minmax(0, 2.8fr) minmax(0, 1.2fr);
    }
  }
`;

const InfoInlineItem = styled.div`
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  white-space: nowrap;
  overflow: hidden;

  strong {
    font-size: 0.6rem;
    font-weight: 900;
    color: #334155;
    letter-spacing: 0.3px;
    flex-shrink: 0;
  }

  span {
    font-size: 0.95rem;
    font-weight: 700;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &.studyload-student-id span {
    overflow: visible;
    text-overflow: clip;
  }

  @media print {
    gap: 0.14rem;

    strong {
      font-size: 0.34rem;
      letter-spacing: 0.1px;
    }

    span {
      font-size: 0.44rem;
      line-height: 1.05;
    }

    &.studyload-student-id span {
      overflow: visible;
      text-overflow: clip;
      font-size: 0.42rem;
    }
  }
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;

  @media print {
    display: none;
  }
`;

const SectionHeader = styled.h3`
  font-size: 1.25rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  position: relative;
  padding-left: 15px;
  &:before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 80%;
    background: #0056b3;
    border-radius: 2px;
  }
`;

const PremiumDownloadButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  background: #0056b3;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 86, 179, 0.2);

  &:hover {
    background: #004494;
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(0, 86, 179, 0.3);
  }
  &:disabled {
    background: #cbd5e1;
    box-shadow: none;
    cursor: not-allowed;
  }
`;

const SubjectTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 3rem;

  th {
    background: #f1f5f9;
    text-align: left;
    padding: 1rem;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #475569;
    border-bottom: 2px solid #cbd5e1;
  }

  td {
    padding: 1rem;
    font-size: 0.95rem;
    color: #1e293b;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: middle;
  }

  .subject-title-cell {
    font-weight: 600;
    color: #0f172a;
  }

  @media print {
    margin-bottom: 0.55rem;

    th {
      padding: 0.26rem 0.34rem;
      font-size: 0.5rem;
      border-bottom-width: 1px;
    }

    td {
      padding: 0.26rem 0.34rem;
      font-size: 0.56rem;
      line-height: 1.15;
    }
  }
`;

const CodeBadge = styled.span`
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: "JetBrains Mono", monospace;
  font-weight: 700;
  font-size: 0.85rem;
  color: #0056b3;
  border: 1px solid #e2e8f0;

  @media print {
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 0.5rem;
    font-family: "Inter", system-ui, sans-serif;
  }
`;

const SignatureSection = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4rem;
  margin-top: 4rem;
  padding-top: 2rem;

  .sig-block {
    text-align: center;
    .line {
      border-bottom: 2px solid #1e293b;
      margin-bottom: 10px;
    }
    span {
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
    }
  }

  @media print {
    gap: 0.9rem;
    margin-top: 0.65rem;
    padding-top: 0.4rem;

    .sig-block {
      .line {
        border-bottom-width: 1px;
        margin-bottom: 3px;
      }
      span {
        font-size: 0.5rem;
      }
    }
  }
`;

const OfficialSeal = styled.div`
  margin-top: 4rem;
  text-align: center;
  p {
    display: inline-block;
    border: 2px dashed #cbd5e1;
    padding: 15px 30px;
    color: #94a3b8;
    font-weight: 800;
    font-size: 0.75rem;
    letter-spacing: 2px;
  }

  @media print {
    margin-top: 0.35rem;
    p {
      border-width: 1px;
      padding: 4px 8px;
      font-size: 0.44rem;
      letter-spacing: 0.6px;
    }
  }
`;

const StudyLoadGlobalPrintStyles = createGlobalStyle`
    @media print {
        html,
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 58mm !important;
            overflow: hidden !important;
        }

        #root {
            height: 58mm !important;
            overflow: hidden !important;
        }

        .chatbot-container,
        .chatbot-overlay,
        .chatbot-window,
        .chatbot-trigger,
        .chatbot-badge,
        [class*="chatbot-"] {
            display: none !important;
            visibility: hidden !important;
        }

        body * {
            visibility: hidden !important;
            pointer-events: none !important;
        }

        #study-load-printable,
        #study-load-printable * {
            visibility: visible !important;
            pointer-events: auto !important;
        }

        #study-load-printable {
            position: absolute !important;
            top: 4mm !important;
            left: 30% !important;
            right: 30% !important;
            width: auto !important;
            height: 54mm !important;
            max-height: 54mm !important;
            min-height: 54mm !important;
            margin: 0 !important;
            padding: 2mm 2.5mm !important;
            box-shadow: none !important;
            border: 1px solid #dbe3eb !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
            page-break-after: avoid !important;
            break-after: avoid-page !important;
        }

        .no-print {
            display: none !important;
        }

        .hidden-print {
            display: none !important;
        }

        #study-load-printable .studyload-print-header {
            gap: 0.35rem !important;
            margin-bottom: 0.35rem !important;
            padding-bottom: 0.2rem !important;
        }

        #study-load-printable .studyload-print-title {
            margin-bottom: 0.2rem !important;
        }

        #study-load-printable .studyload-print-title h2 {
            font-size: 0.44rem !important;
            padding-bottom: 1px !important;
            border-bottom-width: 1px !important;
            letter-spacing: 0.1px !important;
        }

        #study-load-printable .studyload-print-info {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.16rem !important;
            margin-bottom: 0.2rem !important;
            padding: 0.22rem !important;
        }

        #study-load-printable .studyload-line-top,
        #study-load-printable .studyload-line-bottom {
            display: flex !important;
            align-items: center !important;
            gap: 0.18rem !important;
            width: 100% !important;
            min-width: 0 !important;
        }

        #study-load-printable .studyload-line-top .studyload-inline-item:nth-child(1) { flex: 2.1 1 0; }
        #study-load-printable .studyload-line-top .studyload-inline-item:nth-child(2) { flex: 0.9 1 0; }
        #study-load-printable .studyload-line-top .studyload-inline-item:nth-child(3) { flex: 1.7 1 0; }
        #study-load-printable .studyload-line-top .studyload-inline-item:nth-child(4) { flex: 1.6 1 0; }
        #study-load-printable .studyload-line-bottom .studyload-inline-item:nth-child(1) { flex: 2.7 1 0; }
        #study-load-printable .studyload-line-bottom .studyload-inline-item:nth-child(2) { flex: 1.3 1 0; }

        #study-load-printable .studyload-inline-item {
            display: inline-flex !important;
            align-items: baseline !important;
            min-width: 0 !important;
            gap: 0.1rem !important;
            white-space: nowrap !important;
            overflow: hidden !important;
        }

        #study-load-printable .studyload-inline-item strong {
            font-size: 0.32rem !important;
            font-weight: 900 !important;
            letter-spacing: 0.05px !important;
            color: #1e293b !important;
            flex-shrink: 0 !important;
        }

        #study-load-printable .studyload-inline-item span {
            font-size: 0.4rem !important;
            font-weight: 700 !important;
            line-height: 1.05 !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        #study-load-printable .studyload-inline-item.studyload-student-id span {
            overflow: visible !important;
            text-overflow: clip !important;
            font-size: 0.42rem !important;
        }

        #study-load-printable .studyload-print-table-wrap {
            margin-bottom: 0.16rem !important;
        }

        #study-load-printable .studyload-print-table {
            margin-bottom: 0.1rem !important;
        }

        #study-load-printable .studyload-print-table th,
        #study-load-printable .studyload-print-table td {
            padding: 0.09rem 0.14rem !important;
            font-size: 0.34rem !important;
            line-height: 1.05 !important;
        }

        #study-load-printable .studyload-print-table td:first-child span {
            background: transparent !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            font-size: 0.34rem !important;
            font-family: inherit !important;
            color: #0f172a !important;
            font-weight: 700 !important;
        }

        #study-load-printable .studyload-print-table td:nth-child(2) {
            font-size: 0.36rem !important;
            font-weight: 600 !important;
        }

        #study-load-printable .studyload-print-table .subject-title-cell {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 0 !important;
        }

        #study-load-printable .studyload-print-signatures {
            gap: 0.7rem !important;
            margin-top: 0.12rem !important;
            padding-top: 0.12rem !important;
        }

        #study-load-printable .studyload-print-signatures .line {
            margin-bottom: 2px !important;
        }

        #study-load-printable .studyload-print-signatures span {
            font-size: 0.32rem !important;
            letter-spacing: 0.1px !important;
        }

        #study-load-printable .studyload-print-seal {
            margin-top: 0.12rem !important;
        }

        #study-load-printable .studyload-print-seal p {
            padding: 2px 5px !important;
            font-size: 0.3rem !important;
            letter-spacing: 0.2px !important;
            border-width: 1px !important;
        }

        #study-load-printable h1 {
            font-size: 0.56rem !important;
            letter-spacing: 0 !important;
        }

        #study-load-printable h3 {
            font-size: 0.34rem !important;
            margin-top: 1px !important;
            letter-spacing: 0.2px !important;
        }

        #study-load-printable p {
            font-size: 0.3rem !important;
            margin: 0 !important;
            line-height: 1.05 !important;
        }

        @page {
            size: legal landscape;
            margin: 0;
        }
    }
`;

const PrintStyles = styled.div`
  @media print {
    #study-load-printable {
      font-size: 10px;
    }
  }
`;

export default GradesView;
