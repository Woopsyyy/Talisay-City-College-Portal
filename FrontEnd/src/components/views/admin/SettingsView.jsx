import React, { useState } from "react";
import styled from "styled-components";
import { Settings, Trash2, AlertTriangle, CheckCircle, Info, Image as ImageIcon } from "lucide-react";
import Toast from "../../common/Toast";
import { AdminAPI } from "../../../services/api";

const SettingsView = () => {
  const [pictureResult, setPictureResult] = useState(null);
  const [loadingPictures, setLoadingPictures] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const handleCleanupPictures = async () => {
    setLoadingPictures(true);
    setPictureResult(null);

    try {
      const response = await AdminAPI.cleanupPictures();
      setPictureResult(response);

      const removed = Number(response?.deleted || 0);
      setToast({
        show: true,
        message:
          removed > 0
            ? `Removed ${removed} unused profile image${removed === 1 ? "" : "s"}.`
            : "No unused profile images found.",
        type: removed > 0 ? "success" : "info",
      });
    } catch (error) {
      const message = error?.message || "Failed to clean up profile images.";
      setPictureResult({ error: message });
      setToast({ show: true, message, type: "error" });
    } finally {
      setLoadingPictures(false);
    }
  };

  return (
    <StyledContainer>
      <HeaderSection>
        <div>
          <h2>
            <Settings size={32} /> Settings
          </h2>
          <p>Manage system maintenance tasks.</p>
        </div>
      </HeaderSection>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      <MainCard>
        <CardHeader>
          <Trash2 size={20} />
          <h3>System Maintenance</h3>
        </CardHeader>
        <CardBody>
          <ActionCard>
            <ActionHeader>
              <div>
                <h4>Clean Up Unused Pictures</h4>
                <p>Remove profile pictures that are no longer in use.</p>
              </div>
              <IconWrapper>
                <ImageIcon size={24} />
              </IconWrapper>
            </ActionHeader>

            <InfoBox>
              <Info size={16} />
              Clean up unused profile files from the Supabase Storage bucket.
            </InfoBox>

            <ActionButton onClick={handleCleanupPictures} disabled={loadingPictures}>
              {loadingPictures ? "Cleaning Up..." : "Clean Up Images"}
            </ActionButton>

            {pictureResult && (
              <ResultBox>
                {pictureResult.error ? (
                  <div className="error">
                    <AlertTriangle size={14} /> {pictureResult.error}
                  </div>
                ) : pictureResult.deleted > 0 ? (
                  <div className="success">
                    <div>
                      <CheckCircle size={14} /> Deleted {pictureResult.deleted} file(s).{" "}
                      {pictureResult.total_users} users in database.
                    </div>
                    {pictureResult.files && pictureResult.files.length > 0 && (
                      <Details>
                        <summary>View Details</summary>
                        <ul>
                          {pictureResult.files.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </Details>
                    )}
                  </div>
                ) : (
                  <div className="info">
                    <Info size={14} /> No unused pictures found.
                  </div>
                )}
              </ResultBox>
            )}
          </ActionCard>
        </CardBody>
      </MainCard>
    </StyledContainer>
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
  margin-bottom: 2rem;

  h2 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 0.5rem;

    svg {
      color: var(--accent-primary);
    }
  }

  p {
    color: var(--text-secondary);
    font-size: 1.1rem;
    margin: 0;
  }
`;

const MainCard = styled.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 10px;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  svg {
    color: var(--text-secondary);
  }
`;

const CardBody = styled.div`
  padding: 1.5rem;
`;

const ActionCard = styled.div`
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 720px;
`;

const ActionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;

  h4 {
    margin: 0 0 4px;
    font-size: 1.1rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
`;

const IconWrapper = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-primary);
`;

const InfoBox = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: rgba(59, 130, 246, 0.05);
  color: var(--accent-primary);
  border: 1px solid rgba(59, 130, 246, 0.1);
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--accent-primary);
  color: var(--text-inverse);

  &:hover {
    background: var(--accent-highlight);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ResultBox = styled.div`
  margin-top: 1rem;
  font-size: 0.9rem;

  .error {
    color: #ef4444;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .success {
    color: #10b981;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info {
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

const Details = styled.details`
  margin-top: 0.5rem;

  summary {
    cursor: pointer;
    font-size: 0.85rem;
    opacity: 0.8;
  }

  ul {
    margin: 0.5rem 0 0 1rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    max-height: 100px;
    overflow-y: auto;
  }
`;

export default SettingsView;
