import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

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
      <nav className="app-header-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "app-header-nav-link active" : "app-header-nav-link")}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/apartments"
          className={({ isActive }) => (isActive ? "app-header-nav-link active" : "app-header-nav-link")}
        >
          Apartments
        </NavLink>
        <NavLink
          to="/documents"
          className={({ isActive }) => (isActive ? "app-header-nav-link active" : "app-header-nav-link")}
        >
          Documents
        </NavLink>
      </nav>
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
