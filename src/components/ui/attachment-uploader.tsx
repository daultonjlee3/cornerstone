"use client";

import { useMemo, useState } from "react";
import { Button } from "./button";

type AttachmentUploaderProps = {
  onUpload: (payload: {
    fileDataUrl: string;
    fileName: string;
    mimeType: string;
    caption: string;
  }) => Promise<void>;
  disabled?: boolean;
  className?: string;
  allowDocuments?: boolean;
  label?: string;
  submitLabel?: string;
  inputId?: string;
};

const DOCUMENT_MIME_TYPES = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function isAllowedMimeType(mimeType: string, allowDocuments: boolean): boolean {
  if (mimeType.startsWith("image/")) return true;
  if (!allowDocuments) return false;
  return DOCUMENT_MIME_TYPES.has(mimeType);
}

export function AttachmentUploader({
  onUpload,
  disabled = false,
  className = "",
  allowDocuments = true,
  label = "Add attachment",
  submitLabel = "Upload attachment",
  inputId = "work-order-attachment-upload",
}: AttachmentUploaderProps) {
  const [fileDataUrl, setFileDataUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewVisible = useMemo(
    () => fileDataUrl.startsWith("data:image/"),
    [fileDataUrl]
  );

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);
    if (!file) return;
    const type = (file.type ?? "").toLowerCase();
    if (!isAllowedMimeType(type, allowDocuments)) {
      setError(
        allowDocuments
          ? "Unsupported file type. Allowed: images, PDF, Word documents, and plain text."
          : "Please choose an image file."
      );
      return;
    }
    const maxSizeMb = type.startsWith("image/") ? 6 : 9;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File must be under ${maxSizeMb}MB.`);
      return;
    }
    const nextDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Unable to read attachment"));
      reader.readAsDataURL(file);
    });
    setFileDataUrl(nextDataUrl);
    setFileName(file.name);
    setMimeType(type);
  };

  const reset = () => {
    setFileDataUrl("");
    setFileName("");
    setMimeType("");
    setCaption("");
  };

  const handleUpload = async () => {
    if (!fileDataUrl || !fileName || !mimeType) {
      setError("Select a file first.");
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      await onUpload({ fileDataUrl, fileName, mimeType, caption: caption.trim() });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const accept = allowDocuments
    ? "image/*,application/pdf,.pdf,.doc,.docx,text/plain,.txt"
    : "image/*";

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="ui-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={onFileChange}
        disabled={disabled || isUploading}
        className="ui-input"
      />
      <input
        type="text"
        placeholder="Caption (optional)"
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        disabled={disabled || isUploading}
        className="ui-input"
      />
      {fileName ? (
        <p className="text-xs text-[var(--muted)]">
          Selected: <span className="font-medium text-[var(--foreground)]">{fileName}</span>
        </p>
      ) : null}
      {previewVisible ? (
        <img
          src={fileDataUrl}
          alt="Selected upload preview"
          className="h-36 w-full rounded-lg border border-[var(--card-border)] object-cover"
        />
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleUpload}
          disabled={disabled || isUploading || !fileDataUrl}
        >
          {isUploading ? "Uploading…" : submitLabel}
        </Button>
        {fileDataUrl ? (
          <Button type="button" variant="secondary" onClick={reset} disabled={disabled || isUploading}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
