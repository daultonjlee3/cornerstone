"use client";

import { useRef, useState } from "react";
import { useRequestPortalTranslations } from "./RequestPortalI18n";

export function PhotoUploader() {
  const { t } = useRequestPortalTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      setFileName(null);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      const dt = new DataTransfer();
      dt.items.add(file);
      if (inputRef.current) {
        inputRef.current.files = dt.files;
        handleChange({ target: inputRef.current } as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const clearPhoto = () => {
    setPreview(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <span className="ui-label">{t("requestPortal.photoOptional")}</span>
      <input
        ref={inputRef}
        type="file"
        name="photo"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Add photo"
        onChange={handleChange}
      />
      {preview ? (
        <div className="relative rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[var(--background)]">
            <img
              src={preview}
              alt={t("requestPortal.uploadPreview")}
              className="h-full w-full object-contain"
            />
          </div>
          <p className="mt-2 truncate text-xs text-[var(--muted)]">{fileName}</p>
          <button
            type="button"
            onClick={clearPhoto}
            className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            {t("requestPortal.removePhoto")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--card-border)] bg-[var(--background)]/50 py-8 transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent-glow)]/30 min-h-[120px] sm:min-h-[100px]"
        >
          <span className="text-2xl" aria-hidden>📷</span>
          <span className="text-sm font-medium text-[var(--foreground)]">{t("requestPortal.addPhoto")}</span>
          <span className="text-xs text-[var(--muted)]">
            {t("requestPortal.dragOrTap")}
          </span>
        </button>
      )}
    </div>
  );
}
