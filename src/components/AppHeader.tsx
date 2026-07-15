import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

interface AppHeaderProps {
  onOpenSettings: () => void;
  menu?: ReactNode;
}

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/apartments", label: "Apartments", end: false },
  { to: "/tasks", label: "Tasks", end: false },
  { to: "/documents", label: "Documents", end: false },
] as const;

function AppHeader({ onOpenSettings, menu }: AppHeaderProps) {
  return (
    <>
      <header className="app-header">
        <div className="app-header-start">
          <div className="app-header-menu-slot">{menu}</div>
          <Link to="/" className="app-header-title">
            Umzug
          </Link>
        </div>
        <nav className="app-header-nav">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? "app-header-nav-link active" : "app-header-nav-link")}
            >
              {label}
            </NavLink>
          ))}
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

      <nav className="app-bottom-nav" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? "app-bottom-nav-link active" : "app-bottom-nav-link")}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default AppHeader;
