import { useId, useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  className: string;
  apartmentId: string;
  cardKey: "notes" | "timeline" | "photos" | "actions";
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}

function CollapsibleSection({
  className,
  apartmentId,
  cardKey,
  title,
  headerExtra,
  children,
}: CollapsibleSectionProps) {
  const storageKey = `umzug:collapse:${apartmentId}:${cardKey}`;
  const [collapsed, setCollapsed] = useState(() => sessionStorage.getItem(storageKey) === "1");

  // Re-derive collapsed state during render if the storage key identity changes
  // (mirrors the syncedApartmentId pattern in ApartmentDetail.tsx), in case this
  // component instance persists across apartment navigations.
  const [syncedStorageKey, setSyncedStorageKey] = useState(storageKey);
  if (syncedStorageKey !== storageKey) {
    setSyncedStorageKey(storageKey);
    setCollapsed(sessionStorage.getItem(storageKey) === "1");
  }

  const bodyId = useId();

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    sessionStorage.setItem(storageKey, next ? "1" : "0");
  }

  return (
    <section className={className}>
      <div className="section-header collapsible-header">
        <button
          type="button"
          className="collapsible-toggle"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
        >
          <span className="collapsible-caret" aria-hidden="true">
            {collapsed ? "▸" : "▾"}
          </span>
          <h2>{title}</h2>
        </button>
        {headerExtra}
      </div>

      <div className={collapsed ? "collapsible collapsible--collapsed" : "collapsible"}>
        <div id={bodyId} className="collapsible-inner" inert={collapsed}>
          {children}
        </div>
      </div>
    </section>
  );
}

export default CollapsibleSection;
