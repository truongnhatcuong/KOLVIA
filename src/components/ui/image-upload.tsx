"use client";
import { useState, useRef, useEffect, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { useUploadThing } from "@/lib/uploadthing/client";
import type { UploadInput, MediaView } from "@/lib/validations/media";
import { MediaImage } from "./media-image";
import { Icon } from "./icon";
type UploadProps = {
  input: UploadInput;
  assets: MediaView[];
  label: string;
  enabled: boolean;
};
type PhotoProps = UploadProps & {
  shape: "avatar" | "cover" | "logo";
  fallbackSrc: string;
  fallbackAlt?: string;
};

// Keep photo controls separate from the larger upload manager. Profile headers
// must never default to a dropzone when a display option is omitted.
export function ProfilePhotoUpload({ shape, ...props }: PhotoProps) {
  return <UploadEditor {...props} variant={shape} />;
}
export function ImageUpload(props: UploadProps) {
  return <UploadEditor {...props} variant="field" />;
}
function UploadEditor({
  input,
  assets,
  label,
  enabled,
  variant = "field",
  fallbackSrc,
  fallbackAlt,
}: {
  input: UploadInput;
  assets: MediaView[];
  label: string;
  enabled: boolean;
  variant?: "field" | "avatar" | "cover" | "logo";
  fallbackSrc?: string | null;
  fallbackAlt?: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const compact = variant !== "field";
  const [items, setItems] = useState(assets);
  const [sourceAssets, setSourceAssets] = useState(assets);
  if (sourceAssets !== assets) {
    setSourceAssets(assets);
    setItems(assets);
  }
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selection, setSelection] = useState<{ file: File; preview: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const starting = useRef(false);
  useEffect(() => {
    if (!selection) return;
    return () => URL.revokeObjectURL(selection.preview);
  }, [selection]);
  const [progress, setProgress] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onUploadProgress: setProgress,
    onUploadError: (error) => setError(error.message),
    onClientUploadComplete: (files) => {
      const asset = files[0]?.serverData?.asset;
      const serverError = files[0]?.serverData?.error;
      if (serverError) setError(serverError);
      if (asset)
        setItems((old) =>
          input.target === "PORTFOLIO"
            ? [asset, ...old.filter((item) => item.id !== asset.id)]
            : [asset],
        );
      router.refresh();
    },
  });
  const blocked = !enabled || isUploading || saving || removing;
  useEffect(() => {
    if (!compact || !dialog.current) return;
    if (selection && !dialog.current.open) dialog.current.showModal();
    if (!selection && dialog.current.open) dialog.current.close();
  }, [selection, compact]);
  const full = input.target === "PORTFOLIO" && items.length >= 6;
  function selectFile(file?: File) {
    if (fileInput.current) fileInput.current.value = "";
    if (!file || blocked || full) return;
    setError("");
    setMessage("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 4 * 1024 * 1024 ||
      file.size === 0
    ) {
      setError("Chọn ảnh JPG, PNG hoặc WebP, tối đa 4 MB.");
      return;
    }
    setSelection({ file, preview: URL.createObjectURL(file) });
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (blocked || full) return;
    if (event.dataTransfer.files.length !== 1) {
      setError("Chọn một ảnh mỗi lần tải.");
      return;
    }
    selectFile(event.dataTransfer.files[0]);
  }
  async function upload() {
    if (!selection || blocked || full || starting.current) return;
    starting.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    setProgress(0);
    try {
      const result = await startUpload([selection.file], input);
      if (result?.[0]?.serverData?.asset) {
        setSelection(null);
        setMessage("Ảnh đã được lưu.");
      }
    } catch {
      setError("Không thể tải ảnh. Kiểm tra kết nối và thử lại.");
    } finally {
      starting.current = false;
      setSaving(false);
    }
  }
  async function remove(id: string) {
    setRemoving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/media/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không thể xóa ảnh.");
      setItems((old) => old.filter((item) => item.id !== id));
      setMessage("Đã xóa ảnh khỏi hồ sơ hoặc Job.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể kết nối.");
    } finally {
      setRemoving(false);
    }
  }
  return (
    <section data-profile-photo={compact ? variant : undefined} className={compact ? `relative min-w-0 ${variant === "cover" ? "w-full" : variant === "avatar" ? "w-28 shrink-0 sm:w-32" : "w-20 shrink-0"}` : `upload-field upload-${input.target.toLowerCase()}`} aria-label={label}>
      {compact ? (
        <div className={`relative ${variant === "cover" ? "h-48 overflow-hidden rounded-t-2xl sm:h-64" : variant === "avatar" ? "size-28 sm:size-32" : "size-20"}`}>
          <MediaImage
            src={items[0]?.url ?? fallbackSrc}
            alt={items[0] ? label : fallbackAlt ?? label}
            className={`h-full w-full ${variant === "avatar" ? "rounded-full border-4 border-white shadow-sm" : variant === "logo" ? "rounded-2xl border border-line bg-white" : ""}`}
            sizes={variant === "cover" ? "(max-width: 768px) 100vw, 80vw" : variant === "avatar" ? "128px" : "80px"}
          />
          <button
            type="button"
            className={`absolute inline-flex size-10 items-center justify-center rounded-full border border-white bg-white p-2 text-ink shadow-md transition hover:bg-surface-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${variant === "cover" ? "bottom-4 right-4" : "bottom-0 right-0"}`}
            disabled={blocked}
            onClick={() => fileInput.current?.click()}
            aria-label={`${items.length || fallbackSrc ? "Thay" : "Thêm"} ${label.toLowerCase()}`}
            title={enabled ? `${items.length || fallbackSrc ? "Thay" : "Thêm"} ${label.toLowerCase()}` : "Tải ảnh chưa được cấu hình"}
          >
            <Icon name="camera" size={18} />
          </button>
        </div>
      ) : <div className="section-heading flex-wrap">
        <div>
          <h3>{label}</h3>
          <p className="muted">
            JPG, PNG, WebP · Tối đa 4 MB{input.target === "PORTFOLIO" ? " · 6 ảnh" : ""}
          </p>
        </div>
        <button
          type="button"
          className="button secondary small"
          disabled={
            blocked ||
            (input.target === "PORTFOLIO" && items.length >= 6)
          }
          onClick={() => fileInput.current?.click()}
        >
          {isUploading
            ? `Đang tải ${progress}%`
            : items.length && input.target !== "PORTFOLIO"
              ? "Thay ảnh"
              : "+ Tải ảnh"}
        </button>
      </div>}
      <input
        ref={fileInput}
        className="sr-only"
        aria-label={`Chọn ${label.toLowerCase()}`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={blocked}
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
        }}
      />
      {compact && <dialog
        ref={dialog}
        aria-labelledby={`upload-title-${input.target}`}
        onCancel={(event) => {
          if (saving || isUploading) event.preventDefault();
          else setSelection(null);
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={`upload-title-${input.target}`} className="m-0 text-base font-semibold">Cập nhật {label.toLowerCase()}</h2>
          <button type="button" aria-label="Đóng cửa sổ thay ảnh" disabled={saving || isUploading} onClick={() => setSelection(null)} className="inline-flex size-9 items-center justify-center rounded-full bg-surface-low hover:bg-surface-high disabled:opacity-50"><Icon name="close" size={18} /></button>
        </div>
        {selection && <div className="p-5">
          <MediaImage src={selection.preview} alt={`Xem trước ${label.toLowerCase()}`} className={variant === "cover" ? "h-52 w-full rounded-xl" : "mx-auto size-56 rounded-full"} sizes="(max-width: 640px) 90vw, 460px" />
          <p className="mt-4 truncate text-center text-xs text-muted">{selection.file.name} · {(selection.file.size / 1024 / 1024).toFixed(2)} MB</p>
          <p className="mt-2 text-center text-xs text-muted">Ảnh chỉ thay đổi sau khi bạn bấm lưu.</p>
          {isUploading && <progress className="mt-4 w-full" value={progress} max={100} aria-label="Tiến trình tải ảnh" />}
          {error && <p className="notice danger mt-4" role="alert">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="button secondary small" disabled={saving || isUploading} onClick={() => setSelection(null)}>Hủy</button>
            <button type="button" className="button small" disabled={blocked} onClick={() => void upload()}>{saving || isUploading ? `Đang lưu ${progress}%` : "Lưu thay đổi"}</button>
          </div>
        </div>}
      </dialog>}
      {!compact && <div
        className={`upload-area ${dragging ? "dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!blocked && !full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
      >
        {selection && (
          <div className="upload-selection">
            <MediaImage
              src={selection.preview}
              alt={`Xem trước ${selection.file.name}`}
              className="upload-selection-photo"
            />
            <div>
              <strong>{selection.file.name}</strong>
              <small>{(selection.file.size / 1024 / 1024).toFixed(2)} MB · Chưa lưu</small>
              <div className="actions">
                <button
                  type="button"
                  className="button small"
                  disabled={blocked || full}
                  onClick={() => {
                    void upload();
                  }}
                >
                  {isUploading ? `Đang tải ${progress}%` : "Tải ảnh này"}
                </button>
                <button
                  type="button"
                  className="button secondary small"
                  disabled={isUploading || saving}
                  onClick={() => {
                    setSelection(null);
                    setError("");
                  }}
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          </div>
        )}
        {items.length ? (
          <div className="upload-previews">
            {items.map((asset) => (
              <div className="upload-preview relative" key={asset.id}>
                <MediaImage src={asset.url} alt={asset.name} className="upload-photo" />
                <button
                  type="button"
                  className="button danger small icon-action absolute right-3 top-3 shadow-md"
                  title={`Xóa ảnh ${asset.name}`} aria-label={`Xóa ảnh ${asset.name}`}
                  disabled={blocked}
                  onClick={() => {
                    void remove(asset.id);
                  }}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="upload-drop"
            disabled={blocked}
            onClick={() => fileInput.current?.click()}
          >
            <span aria-hidden="true">↑</span>
            <strong>Chọn ảnh từ thiết bị</strong>
            <small>Kéo thả ảnh vào đây hoặc bấm để chọn.</small>
          </button>
        )}
      </div>}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {!compact && isUploading && <progress value={progress} max={100} aria-label="Tiến trình tải ảnh" />}
      {!enabled && (
        <p className="notice">Chức năng tải ảnh chưa được cấu hình. Liên hệ quản trị viên.</p>
      )}
      {error && !(compact && selection) && (
        <p className="notice danger" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
