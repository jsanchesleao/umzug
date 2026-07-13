import { useEffect, useState } from "react";
import type { Photo } from "../types";
import PhotoViewerModal from "./PhotoViewerModal";

interface PhotoThumbProps {
  photo: Photo;
}

function PhotoThumb({ photo }: PhotoThumbProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    // The object URL must be created and revoked within the same effect
    // instance: creating it via useMemo instead lets StrictMode's
    // mount/cleanup/remount cycle revoke the URL before a freshly mounted
    // <img> (e.g. in the photo viewer) has loaded it.
    const objectUrl = URL.createObjectURL(photo.blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to an external resource (object URL), not deriving render state
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo.blob]);

  if (!url) return null;

  return (
    <>
      <button type="button" className="photo-thumb" onClick={() => setViewing(true)}>
        <img src={url} alt={photo.caption ?? "Apartment photo"} />
      </button>
      {viewing && <PhotoViewerModal photo={photo} url={url} onClose={() => setViewing(false)} />}
    </>
  );
}

export default PhotoThumb;
