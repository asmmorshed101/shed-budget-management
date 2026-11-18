
import { Bell, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  return (
    <header className="top-header">
      <button className="mobile-menu" onClick={onMenuClick}>
        <Menu size={22} />
      </button>

      <div>
        <h3>Secondary and Higher Education Division</h3>
        <p>Government of the People's Republic of Bangladesh</p>
      </div>

      <div className="header-actions">
        <button className="icon-button" aria-label="Notifications">
          <Bell size={20} />
        </button>
        <span className="header-user">{user?.email} · {user?.role?.replace("_", " ")}</span>
        <Link className="header-link" to="/change-password">Password</Link>
        <button className="header-link" onClick={logout}>Sign out</button>
      </div>
    </header>
  );
}
