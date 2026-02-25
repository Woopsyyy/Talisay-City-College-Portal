import React from 'react';
import baseStyled, { keyframes } from 'styled-components';

const styled = baseStyled as any;

type PageSkeletonProps = {
  variant?: string;
  count?: number;
  compact?: boolean;
  columns?: number;
};

const PageSkeleton = ({
  variant = 'page',
  count = 3,
  compact = false,
  columns = 4,
}: PageSkeletonProps) => {
  const renderHeader = () => (
    <Header>
      <SkeletonBlock $w="42%" $h="18px" />
      <SkeletonBlock $w="64%" $h="12px" />
    </Header>
  );

  const renderStats = (items = 3) => (
    <Grid $min="220px">
      {Array.from({ length: items }).map((_, i) => (
        <Card key={`stat-${i}`}>
          <Row $gap="12px">
            <SkeletonBlock $w="44px" $h="44px" $radius="12px" />
            <Column>
              <SkeletonBlock $w="60%" $h="12px" />
              <SkeletonBlock $w="40%" $h="16px" />
            </Column>
          </Row>
          <SkeletonBlock $w="90%" $h="10px" />
        </Card>
      ))}
    </Grid>
  );

  const renderCards = (items = count) => (
    <Grid $min="260px">
      {Array.from({ length: items }).map((_, i) => (
        <Card key={`card-${i}`}>
          <SkeletonBlock $w="70%" $h="14px" />
          <SkeletonBlock $w="90%" $h="10px" />
          <SkeletonBlock $w="80%" $h="10px" />
          <SkeletonBlock $w="55%" $h="10px" />
          <Row $gap="10px">
            <SkeletonBlock $w="28%" $h="12px" />
            <SkeletonBlock $w="22%" $h="12px" />
          </Row>
        </Card>
      ))}
    </Grid>
  );

  const renderChart = () => (
    <Grid $min="320px">
      <Card>
        <SkeletonBlock $w="45%" $h="14px" />
        <Chart />
        <Row $gap="12px">
          <SkeletonBlock $w="18%" $h="10px" />
          <SkeletonBlock $w="20%" $h="10px" />
          <SkeletonBlock $w="14%" $h="10px" />
        </Row>
      </Card>
      <Card>
        <SkeletonBlock $w="40%" $h="14px" />
        <Chart $h="160px" />
        <Row $gap="12px">
          <SkeletonBlock $w="22%" $h="10px" />
          <SkeletonBlock $w="16%" $h="10px" />
        </Row>
      </Card>
    </Grid>
  );

  const renderTable = (rows = compact ? 5 : 8, cols = columns || 4) => (
    <TableCard>
      <TableRow $cols={cols}>
        {Array.from({ length: cols }).map((_, c) => (
          <SkeletonBlock key={`th-${c}`} $w="80%" $h="12px" />
        ))}
      </TableRow>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={`tr-${r}`} $cols={cols}>
          <SkeletonBlock $w={r % 2 === 0 ? '85%' : '70%'} $h="12px" />
          <SkeletonBlock $w={r % 3 === 0 ? '60%' : '75%'} $h="12px" />
          <SkeletonBlock $w="40%" $h="12px" />
          <SkeletonBlock $w="50%" $h="12px" />
        </TableRow>
      ))}
    </TableCard>
  );

  const renderList = (rows = compact ? 5 : 8) => (
    <Column $gap="14px">
      {Array.from({ length: rows }).map((_, i) => (
        <Row key={`row-${i}`} $gap="14px">
          <SkeletonBlock $w="44px" $h="44px" $radius="50%" />
          <Column>
            <SkeletonBlock $w="50%" $h="12px" />
            <SkeletonBlock $w="70%" $h="10px" />
          </Column>
        </Row>
      ))}
    </Column>
  );

  const renderForm = (fields = compact ? 4 : 6) => (
    <Card>
      {Array.from({ length: fields }).map((_, i) => (
        <Column key={`field-${i}`} $gap="8px">
          <SkeletonBlock $w="30%" $h="10px" />
          <SkeletonBlock $w="100%" $h="40px" $radius="10px" />
        </Column>
      ))}
      <Row $gap="12px" style={{ marginTop: '0.5rem' }}>
        <SkeletonBlock $w="140px" $h="40px" $radius="10px" />
        <SkeletonBlock $w="120px" $h="40px" $radius="10px" />
      </Row>
    </Card>
  );

  const renderPortal = () => (
    <>
      {renderHeader()}

      <PortalHeroGrid>
        <PortalMainCard>
          <SkeletonBlock $w="34%" $h="14px" />
          <SkeletonBlock $w="72%" $h="10px" />
          <SkeletonBlock $w="100%" $h="172px" $radius="14px" />
        </PortalMainCard>

        <PortalSideStack>
          <Card>
            <SkeletonBlock $w="48%" $h="13px" />
            <SkeletonBlock $w="80%" $h="10px" />
            <SkeletonBlock $w="56%" $h="10px" />
          </Card>
          <Card>
            <SkeletonBlock $w="52%" $h="13px" />
            <SkeletonBlock $w="84%" $h="10px" />
            <SkeletonBlock $w="60%" $h="10px" />
          </Card>
        </PortalSideStack>
      </PortalHeroGrid>

      <Grid $min="200px">
        <Card>
          <SkeletonBlock $w="56%" $h="12px" />
          <SkeletonBlock $w="34%" $h="20px" />
          <SkeletonBlock $w="82%" $h="10px" />
        </Card>
        <Card>
          <SkeletonBlock $w="58%" $h="12px" />
          <SkeletonBlock $w="36%" $h="20px" />
          <SkeletonBlock $w="80%" $h="10px" />
        </Card>
        <Card>
          <SkeletonBlock $w="50%" $h="12px" />
          <SkeletonBlock $w="32%" $h="20px" />
          <SkeletonBlock $w="74%" $h="10px" />
        </Card>
      </Grid>

      <PortalBodyGrid>
        <TableCard>
          <TableRow $cols={4}>
            <SkeletonBlock $w="74%" $h="12px" />
            <SkeletonBlock $w="78%" $h="12px" />
            <SkeletonBlock $w="62%" $h="12px" />
            <SkeletonBlock $w="64%" $h="12px" />
          </TableRow>
          {Array.from({ length: compact ? 5 : 8 }).map((_, row) => (
            <TableRow key={`portal-row-${row}`} $cols={4}>
              <SkeletonBlock $w={row % 2 === 0 ? "88%" : "72%"} $h="12px" />
              <SkeletonBlock $w={row % 3 === 0 ? "62%" : "78%"} $h="12px" />
              <SkeletonBlock $w="44%" $h="12px" />
              <SkeletonBlock $w="58%" $h="12px" />
            </TableRow>
          ))}
        </TableCard>

        <Column $gap="1rem">
          <Card>
            <SkeletonBlock $w="58%" $h="12px" />
            <SkeletonBlock $w="100%" $h="120px" $radius="12px" />
          </Card>
          <Card>
            <SkeletonBlock $w="44%" $h="12px" />
            <SkeletonBlock $w="84%" $h="10px" />
            <SkeletonBlock $w="66%" $h="10px" />
            <SkeletonBlock $w="70%" $h="10px" />
          </Card>
        </Column>
      </PortalBodyGrid>
    </>
  );

  const renderPage = () => (
    <>
      {renderHeader()}
      {renderStats(3)}
      {renderChart()}
      {renderTable()}
    </>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'dashboard':
        return (
          <>
            {renderHeader()}
            {renderStats(4)}
            {renderChart()}
            {renderTable()}
          </>
        );
      case 'portal':
        return renderPortal();
      case 'table':
        return (
          <>
            {!compact && renderHeader()}
            {renderTable()}
          </>
        );
      case 'cards':
        return (
          <>
            {!compact && renderHeader()}
            {renderCards()}
          </>
        );
      case 'list':
        return (
          <>
            {!compact && renderHeader()}
            {renderList()}
          </>
        );
      case 'form':
        return (
          <>
            {!compact && renderHeader()}
            {renderForm()}
          </>
        );
      default:
        return renderPage();
    }
  };

  return (
    <Wrapper $compact={compact}>
      {renderVariant()}
    </Wrapper>
  );
};

const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => (props.$compact ? '1rem' : '1.5rem')};
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: ${(props) => (props.$compact ? '0' : '1rem 0 2rem')};
`;

const SkeletonBlock = styled.div`
  position: relative;
  overflow: hidden;
  background: var(--bg-tertiary);
  border-radius: ${(props) => props.$radius || '8px'};
  width: ${(props) => props.$w || '100%'};
  height: ${(props) => props.$h || '12px'};
  opacity: 0.9;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      110deg,
      transparent 0%,
      rgba(255, 255, 255, 0.45) 40%,
      transparent 80%
    );
    animation: ${shimmer} 1.4s linear infinite;
  }
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${(props) => props.$min || '240px'}, 1fr));
  gap: 1.25rem;
`;

const PortalHeroGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 1.25rem;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const PortalMainCard = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: var(--shadow-sm);
  min-height: 260px;
`;

const PortalSideStack = styled.div`
  display: grid;
  gap: 1.25rem;
  grid-template-rows: repeat(2, minmax(0, 1fr));

  @media (max-width: 1100px) {
    grid-template-rows: unset;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
`;

const PortalBodyGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
  gap: 1.25rem;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Card = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: var(--shadow-sm);
`;

const TableCard = styled(Card)`
  gap: 0.9rem;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: repeat(${(props) => props.$cols || 4}, minmax(0, 1fr));
  gap: 1rem;
  align-items: center;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.$gap || '8px'};
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.$gap || '6px'};
  flex: 1;
`;

const Chart = styled(SkeletonBlock).attrs((props) => ({
  $h: props.$h || '220px',
  $w: '100%',
  $radius: '12px',
}))``;

export default PageSkeleton;
