import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AppHeaderProps {
  onOpenSettings: () => void;
  menu?: ReactNode;
}

function AppHeader({ onOpenSettings, menu }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-start">
        <div className="app-header-menu-slot">{menu}</div>
        <Link to="/" className="app-header-title">
          Umzug
        </Link>
      </div>
      <button
        type="button"
        className="app-header-settings"
        aria-label="Options"
        onClick={onOpenSettings}
      >
        ⚙
      </button>
    </header>
  );
}

export default AppHeader;
