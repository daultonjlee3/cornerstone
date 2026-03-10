"use client";

import { useMemo, useState } from "react";
import { Button } from "./button";

type PhotoUploaderProps = {
  onUpload: (payload: {
    fileDataUrl: string;
    fileName: string;
    mimeType: string;
    caption: string;
  }) => Promise<void>;
  disabled?: boolean;
  className?: string;
};

export function PhotoUploader({ onUpload, disabled = false, className = "" }: PhotoUploaderProps) {
  const [fileDataUrl, setFileDataUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewVisible = useMemo(() => fileDataUrl.startsWith("data:image/"), [fileDataUrl]);

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("Image must be under 6MB.");
      return;
    }
    const nextDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Unable to read image"));
      reader.readAsDataURL(file);
    });
    setFileDataUrl(nextDataUrl);
    setFileName(file.name);
    setMimeType(file.type);
  };

  const reset = () => {
    setFileDataUrl("");
    setFileName("");
    setMimeType("");
    setCaption("");
  };

  const handleUpload = async () => {
    if (!fileDataUrl || !fileName || !mimeType) {
      setError("Select a photo first.");
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

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="ui-label" htmlFor="technician-photo-upload">
        Add photo
      </label>
      <input
        id="technician-photo-upload"
        type="file"
        accept="image/*"
        capture="environment"
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
          {isUploading ? "Uploading…" : "Upload photo"}
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
