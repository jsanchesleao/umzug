import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listSketchPagesForApartment } from "../data/sketchPages";
import SketchThumb from "./SketchThumb";
import SketchEditorModal from "./SketchEditorModal";
import CollapsibleSection from "./CollapsibleSection";

interface SketchSectionProps {
  apartmentId: string;
}

function SketchSection({ apartmentId }: SketchSectionProps) {
  const [addingPage, setAddingPage] = useState(false);
  const pages = useLiveQuery(() => listSketchPagesForApartment(apartmentId), [apartmentId]);

  return (
    <CollapsibleSection
      className="case-file-sketches"
      entityId={apartmentId}
      cardKey="sketches"
      title="Sketches"
      headerExtra={
        <button type="button" className="btn btn-sm" onClick={() => setAddingPage(true)}>
          + Add sketch
        </button>
      }
    >
      {pages && pages.length > 0 ? (
        <div className="sketch-grid">
          {pages.map((page) => (
            <SketchThumb key={page.id} page={page} />
          ))}
        </div>
      ) : (
        <button type="button" className="sketch-empty-widget" onClick={() => setAddingPage(true)}>
          <span className="sketch-empty-widget-title">No sketches yet</span>
          <span className="sketch-empty-widget-hint">Click to draw a hand-written note page</span>
        </button>
      )}

      {addingPage && (
        <SketchEditorModal
          apartmentId={apartmentId}
          initialPageId={null}
          onClose={() => setAddingPage(false)}
        />
      )}
    </CollapsibleSection>
  );
}

export default SketchSection;
