import React, { useEffect, useMemo, useState } from 'react';
import baseStyled from 'styled-components';
import { AlertCircle, BookOpen, CheckCircle2, Search, UserRound } from 'lucide-react';
import { StudentAPI, getAvatarUrl } from '../../../services/api';
import PageSkeleton from '../../loaders/PageSkeleton';
const styled = baseStyled as any;

const TeacherInformationView = () => {
    const [teachers, setTeachers] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadTeachers = async () => {
            try {
                setLoading(true);
                setError('');

                const result = await StudentAPI.getEvaluationTeachers();
                const teacherRows = Array.isArray(result?.teachers) ? result.teachers : [];

                const withAvatars = await Promise.all(
                    teacherRows.map(async (teacher) => {
                        const avatarUrl = await getAvatarUrl(teacher.id, teacher.image_path);
                        return {
                            ...teacher,
                            avatar_url: avatarUrl || '/images/sample.jpg',
                            subjects: Array.isArray(teacher.subjects) ? teacher.subjects : [],
                        };
                    })
                );

                setTeachers(withAvatars);
            } catch (err) {
                console.error('Load teacher information error:', err);
                setError(err.message || 'Failed to load teacher information.');
            } finally {
                setLoading(false);
            }
        };

        loadTeachers();
    }, []);

    const filteredTeachers = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return teachers;

        return teachers.filter((teacher) => {
            const name = String(teacher.name || '').toLowerCase();
            const subjectText = (teacher.subjects || [])
                .map((subject) => `${subject.code || ''} ${subject.title || ''}`)
                .join(' ')
                .toLowerCase();

            return name.includes(normalizedQuery) || subjectText.includes(normalizedQuery);
        });
    }, [teachers, query]);

    if (loading) {
        return (
            <LoadingContainer>
                <PageSkeleton variant="cards" count={4} />
            </LoadingContainer>
        );
    }

    if (error) {
        return (
            <ErrorState>
                <AlertCircle size={40} />
                <h3>Unable To Load Teachers</h3>
                <p>{error}</p>
            </ErrorState>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderTitle>
                    <UserRound size={28} />
                    <div>
                        <h2>Teacher Information</h2>
                        <p>View your active teachers and assigned subjects.</p>
                    </div>
                </HeaderTitle>
                <SearchBox>
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search teacher or subject"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </SearchBox>
            </Header>

            {filteredTeachers.length === 0 ? (
                <EmptyState>
                    <BookOpen size={48} />
                    <h3>No Teachers Found</h3>
                    <p>{query ? 'Try a different search term.' : 'No teacher assignments found for your section.'}</p>
                </EmptyState>
            ) : (
                <Grid>
                    {filteredTeachers.map((teacher) => (
                        <Card key={teacher.id}>
                            <CardHeader>
                                <Avatar
                                    src={teacher.avatar_url || '/images/sample.jpg'}
                                    alt={teacher.name || 'Teacher'}
                                    onError={(e) => {
                                        e.currentTarget.src = '/images/sample.jpg';
                                    }}
                                />
                                <TeacherMeta>
                                    <h3>{teacher.name || 'Unknown Teacher'}</h3>
                                    <Status $evaluated={Boolean(teacher.evaluated)}>
                                        <CheckCircle2 size={14} />
                                        {teacher.evaluated ? 'Evaluated' : 'Not Evaluated'}
                                    </Status>
                                </TeacherMeta>
                            </CardHeader>

                            <Subjects>
                                {(teacher.subjects || []).length === 0 ? (
                                    <SubjectPill>No subjects listed</SubjectPill>
                                ) : (
                                    teacher.subjects.map((subject, index) => (
                                        <SubjectPill key={`${teacher.id}-${subject.code || 'sub'}-${index}`}>
                                            <strong>{subject.code || 'N/A'}</strong>
                                            <span>{subject.title || 'Untitled subject'}</span>
                                        </SubjectPill>
                                    ))
                                )}
                            </Subjects>
                        </Card>
                    ))}
                </Grid>
            )}
        </Container>
    );
};

const Container = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    animation: fadeIn 0.35s ease-out;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
`;

const HeaderTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;

    svg {
        color: var(--accent-primary);
        flex-shrink: 0;
    }

    h2 {
        margin: 0;
        color: var(--text-primary);
        font-size: 1.7rem;
        font-weight: 800;
    }

    p {
        margin: 0.25rem 0 0;
        color: var(--text-secondary);
    }
`;

const SearchBox = styled.label`
    min-width: 280px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-secondary);

    input {
        width: 100%;
        border: none;
        background: transparent;
        color: var(--text-primary);
        font-size: 0.95rem;
        outline: none;
    }
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
`;

const Card = styled.article`
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    border-radius: 14px;
    padding: 1rem;
    box-shadow: var(--shadow-sm);
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 0.85rem;
    margin-bottom: 0.9rem;
`;

const Avatar = styled.img`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--border-color);
    flex-shrink: 0;
`;

const TeacherMeta = styled.div`
    min-width: 0;

    h3 {
        margin: 0 0 0.35rem;
        color: var(--text-primary);
        font-size: 1rem;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

const Status = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    color: ${(props) => (props.$evaluated ? '#15803d' : '#b45309')};
    background: ${(props) => (props.$evaluated ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)')};
`;

const Subjects = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const SubjectPill = styled.div`
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-primary);
    padding: 0.55rem 0.7rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    strong {
        color: var(--text-primary);
        font-size: 0.85rem;
    }

    span {
        color: var(--text-secondary);
        font-size: 0.82rem;
        line-height: 1.35;
    }
`;

const EmptyState = styled.div`
    border: 1px dashed var(--border-color);
    border-radius: 14px;
    background: var(--bg-secondary);
    padding: 3rem 1.5rem;
    text-align: center;
    color: var(--text-secondary);

    svg {
        opacity: 0.45;
        margin-bottom: 0.6rem;
    }

    h3 {
        margin: 0 0 0.35rem;
        color: var(--text-primary);
    }

    p {
        margin: 0;
    }
`;

const ErrorState = styled(EmptyState)`
    svg,
    p {
        color: #ef4444;
    }
`;

const LoadingContainer = styled.div`
    max-width: 1200px;
    margin: 0 auto;
`;

export default TeacherInformationView;
