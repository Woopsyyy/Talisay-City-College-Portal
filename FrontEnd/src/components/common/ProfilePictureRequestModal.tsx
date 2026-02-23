import React, { useEffect, useMemo, useRef, useState } from "react";
import baseStyled from "styled-components";
import { Camera, Save, Upload, X } from "lucide-react";
import imageCompression from "browser-image-compression";

const styled = baseStyled as any;

type Props = {
  isOpen: boolean;
  submitting?: boolean;
  basePreviewUrl?: string;
  onClose: () => void;
  onSubmit: (file: File) => Promise<void> | void;
};

const ProfilePictureRequestModal = ({
  isOpen,
  submitting = false,
  basePreviewUrl = "/images/sample.jpg",
  onClose,
  onSubmit,
}: Props) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("/images/sample.jpg");
  const [error, setError] = useState("");
  const [compressing, setCompressing] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fallbackPreview = useMemo(() => {
    const raw = String(basePreviewUrl || "").trim();
    return raw || "/images/sample.jpg";
  }, [basePreviewUrl]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setError("");
      setPreviewUrl("/images/sample.jpg");
      return;
    }
    setPreviewUrl(fallbackPreview);
  }, [fallbackPreview, isOpen]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!String(file.type || "").toLowerCase().startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }

    try {
      setCompressing(true);
      setError("");
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.15,
        maxWidthOrHeight: 400,
        useWebWorker: true,
        fileType: "image/jpeg",
        initialQuality: 0.8,
      });

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      const objectUrl = URL.createObjectURL(compressedFile);
      objectUrlRef.current = objectUrl;
      setSelectedFile(compressedFile);
      setPreviewUrl(objectUrl);
    } catch (_error) {
      setError("Failed to process image.");
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Please upload a profile picture first.");
      return;
    }

    setError("");
    await onSubmit(selectedFile);
  };

  if (!isOpen) return null;

  return (
    <Overlay>
      <ModalCard>
        <Header>
          <div>
            <h3>
              <Camera size={18} />
              Request Profile Picture Update
            </h3>
            <p>Upload your new profile photo, then click save to submit for admin approval.</p>
          </div>
          <IconButton type="button" onClick={onClose} disabled={submitting}>
            <X size={16} />
          </IconButton>
        </Header>

        <PreviewWrap>
          <PreviewImage
            loading="lazy"
            src={previewUrl}
            onError={(event) => {
              const image = event.currentTarget as HTMLImageElement;
              image.src = "/images/sample.jpg";
            }}
            alt="Profile preview"
          />
        </PreviewWrap>

        {error ? <ErrorText>{error}</ErrorText> : null}

        <Actions>
          <HiddenInput ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} />
          <SecondaryButton type="button" onClick={handleOpenFilePicker} disabled={submitting || compressing}>
            <Upload size={16} />
            {compressing ? "Processing..." : "Upload Profile Picture"}
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSubmit} disabled={submitting || !selectedFile}>
            <Save size={16} />
            {submitting ? "Saving..." : "Save"}
          </PrimaryButton>
        </Actions>
      </ModalCard>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(2px);
`;

const ModalCard = styled.div`
  width: 100%;
  max-width: 520px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  padding: 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.9rem;

  h3 {
    margin: 0 0 0.35rem;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary);
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
`;

const IconButton = styled.button`
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PreviewWrap = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 0.8rem;
`;

const PreviewImage = styled.img`
  width: 140px;
  height: 140px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--accent-primary);
  background: var(--bg-primary);
`;

const ErrorText = styled.p`
  margin: 0 0 0.75rem;
  color: #ef4444;
  font-size: 0.84rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.7rem;

  @media (max-width: 560px) {
    flex-direction: column;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const SecondaryButton = styled.button`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.62rem 0.75rem;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled.button`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: 8px;
  padding: 0.62rem 0.75rem;
  background: var(--accent-primary);
  color: white;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default ProfilePictureRequestModal;
