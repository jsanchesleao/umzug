import { useEffect, useState } from "react";
import type { SketchPage } from "../types";
import SketchEditorModal from "./SketchEditorModal";

interface SketchThumbProps {
  page: SketchPage;
}

function SketchThumb({ page }: SketchThumbProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    // See PhotoThumb for why this is created/revoked in the same effect
    // instance rather than via useMemo.
    const objectUrl = URL.createObjectURL(page.blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to an external resource (object URL), not deriving render state
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [page.blob]);

  if (!url) return null;

  return (
    <>
      <button type="button" className="sketch-thumb" onClick={() => setEditing(true)}>
        <img src={url} alt="Sketch page" className="sketch-ink" />
      </button>
      {editing && (
        <SketchEditorModal
          apartmentId={page.apartmentId}
          initialPageId={page.id}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

export default SketchThumb;
