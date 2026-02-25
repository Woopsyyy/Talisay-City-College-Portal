import React, { useEffect, useMemo, useRef, useState } from "react";
import baseStyled from "styled-components";
import { Camera, Save, Upload } from "lucide-react";
import imageCompression from "browser-image-compression";
import { useAuth } from "../../context/AuthContext";
import { AuthAPI } from "../../services/apis/auth";

const styled = baseStyled as any;

const RequiredAvatarModal = () => {
  const { user, loading, isAuthenticated, avatarRequired, avatarUrl, checkAuth } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("/images/sample.jpg");
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const isOpen = Boolean(!loading && isAuthenticated && user?.id && avatarRequired);

  const fallbackPreview = useMemo(() => {
    const raw = String(avatarUrl || "").trim();
    return raw || "/images/sample.jpg";
  }, [avatarUrl]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setError("");
      setPreviewUrl("/images/sample.jpg");
      return;
    }
    setPreviewUrl(fallbackPreview);
  }, [isOpen, fallbackPreview]);

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
      const options = {
        maxSizeMB: 0.15, // Max 150KB
        maxWidthOrHeight: 400, // Reasonable size for avatars
        useWebWorker: true,
        fileType: "image/jpeg",
        initialQuality: 0.8
      };
      
      const compressedFile = await imageCompression(file, options);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      const objectUrl = URL.createObjectURL(compressedFile);
      objectUrlRef.current = objectUrl;
      setSelectedFile(compressedFile);
      setPreviewUrl(objectUrl);
    } catch (err) {
      console.error("Compression error:", err);
      setError("Failed to process image.");
    } finally {
      setCompressing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) {
      setError("Please select a profile picture first.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const formData = new FormData();
      formData.append("profile_image", selectedFile);

      const result = await AuthAPI.updateProfile(formData);
      if (!result?.success) {
        throw new Error(result?.error || "Failed to upload profile picture.");
      }

      await checkAuth();
      setSelectedFile(null);
    } catch (err: any) {
      setError(err?.message || "Failed to save profile picture.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay>
      <ModalCard>
        <Header>
          <Camera size={20} />
          <span>Profile Picture Required</span>
        </Header>
        <Description>
          Upload a profile picture to continue. This prompt will stay until your default avatar is replaced.
        </Description>

        <PreviewWrapper>
          <PreviewImage loading="lazy"
            src={previewUrl}
            alt="Profile preview"
            onError={(event) => {
              const image = event.currentTarget as HTMLImageElement;
              image.src = "/images/sample.jpg";
            }}
          />
        </PreviewWrapper>

        {error ? <ErrorText>{error}</ErrorText> : null}

        <Actions>
          <HiddenInput
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          <SecondaryButton type="button" onClick={handleOpenFilePicker} disabled={saving}>
            <Upload size={16} />
            Upload Picture
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSave} disabled={saving || !selectedFile}>
            <Save size={16} />
            {saving ? "Saving..." : "Save"}
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
  max-width: 440px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  padding: 1.25rem;
`;

const Header = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.55rem;
`;

const Description = styled.p`
  margin: 0 0 1rem;
  color: var(--text-secondary);
  font-size: 0.92rem;
`;

const PreviewWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 0.9rem;
`;

const PreviewImage = styled.img`
  width: 124px;
  height: 124px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--accent-primary);
  background: var(--bg-primary);
`;

const ErrorText = styled.p`
  margin: 0 0 0.8rem;
  color: #dc2626;
  font-size: 0.84rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.7rem;
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
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
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
  color: var(--text-inverse);
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export default RequiredAvatarModal;
