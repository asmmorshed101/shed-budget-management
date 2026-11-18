
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  Layers,
  Building2,
  FolderKanban,
  Receipt,
  FileBarChart,
  CalendarDays,
  ChevronLeft,
  ReceiptText ,
  GraduationCap,
  ChartNoAxesCombined,
  FileDown,
  Tags,
  History,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const menuItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Ministry Budget", path: "/ministry-budget", icon: Wallet },
  // { label: "Budget Categories", path: "/categories", icon: Layers },
  { label: "Expenditure Heads", path: "/expense-heads", icon: Tags },
  { label: "Budget Sources", path: "/sources", icon: Wallet },
  { label: "Office Management", path: "/offices", icon: Building2 },
  { label: "Office Allocation", path: "/office-allocations", icon: Building2 },
  { label: "Project Management", path: "/projects", icon: FolderKanban },
  // { label: "Expenditure Entry", path: "/expenditures", icon: Receipt },
  { label: "Central Reports", path: "/reports", icon: FileBarChart },
  { label: "Fiscal Years", path: "/fiscal-years", icon: CalendarDays },
  { label: "Expenditure Entry", path: "/expenditures", icon: ReceiptText },
  { label: "Budget Head Allocation", path: "/head-budget-allocation", icon: Wallet },
  // { label: "My Project Dashboard", path: "/my-project-dashboard", icon: ChartNoAxesCombined },
  { label: "Project Dashboard", path: "/project-dashboard", icon: ChartNoAxesCombined },
  { label: "Office Dashboard", path: "/office-dashboard", icon: ChartNoAxesCombined },
  { label: "Download Reports", path: "/download-reports", icon: FileDown },
];

export default function Sidebar() {
  const { user } = useAuth();
  const visibleItems = menuItems.filter(({ path }) => {
    if (user?.role === "SUPER_ADMIN") return true;
    if (user?.role === "USER") return ["/reports", "/download-reports"].includes(path);
    if (user?.role === "ADMIN") return ["/", "/expenditures"].includes(path) || ((user.assignedProjectId || user.assignedOfficeAllocationId) && path === "/head-budget-allocation") || (user.assignedProjectId && path === "/my-project-dashboard");
    return false;
  });
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <GraduationCap size={25} />
        </div>
        <div>
          <h2>SHED Budget</h2>
          <span>Management System</span>
        </div>
      </div>

      <div className="sidebar-label">MAIN MENU</div>

      <nav className="sidebar-nav">
        {visibleItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
        {user?.role === "SUPER_ADMIN" && <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}><Tags size={19} /><span>User Management</span></NavLink>}
        {user?.role === "SUPER_ADMIN" && <NavLink to="/audit-logs" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}><History size={19} /><span>Activity Log</span></NavLink>}
      </nav>

      <div className="sidebar-footer">
        <span>Secondary and Higher</span>
        <span>Education Division</span>
        <small>Budget Management System</small>
      </div>
    </aside>
  );
}
