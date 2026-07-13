import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { createPhoto, listPhotosForApartment } from "../data/photos";
import { compressImage } from "../utils/image";
import PhotoThumb from "./PhotoThumb";

interface PhotoSectionProps {
  apartmentId: string;
}

function PhotoSection({ apartmentId }: PhotoSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photos = useLiveQuery(() => listPhotosForApartment(apartmentId), [apartmentId]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const blob = await compressImage(file);
        await createPhoto({ apartmentId, blob, caption: null });
      }
    } catch {
      setError("Failed to add one or more photos.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="case-file-photos">
      <div className="section-header">
        <h2>Photos</h2>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Adding…" : "+ Add photo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="visually-hidden"
          aria-label="Add photos"
          onChange={handleFileChange}
        />
      </div>

      {error && <p className="field-error">{error}</p>}

      {photos && photos.length > 0 ? (
        <div className="photo-grid">
          {photos.map((photo) => (
            <PhotoThumb key={photo.id} photo={photo} />
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="photo-empty-widget"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="photo-empty-widget-title">No photos yet</span>
          <span className="photo-empty-widget-hint">Click to add photos of this apartment</span>
        </button>
      )}
    </section>
  );
}

export default PhotoSection;
