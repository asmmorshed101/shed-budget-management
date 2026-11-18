
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/PlaceholderPage";
import MinistryBudget from "./pages/MinistryBudget";
import BudgetSources from "./pages/BudgetSources";
import OfficeAllocation from "./pages/OfficeAllocation";
import Projects from "./pages/Projects";
import OfficeManagement from "./pages/OfficeManagement";
import FiscalYears from "./pages/FiscalYears";
import ExpenditureEntry from "./pages/ExpenditureEntry";
import ProjectDashboard from "./pages/ProjectDashboard";
import CentralReports from "./pages/CentralReports";
import DownloadReports from "./pages/DownloadReports";
import ExpenseHeads from "./pages/ExpenseHeads";
import OfficeDashboard from "./pages/OfficeDashboard";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import UserManagement from "./pages/UserManagement";
import MyProjectDashboard from "./pages/MyProjectDashboard";
import BudgetHeadAllocation from "./pages/BudgetHeadAllocation";
import AuditLogs from "./pages/AuditLogs";
import { AuthProvider, useAuth } from "./auth/AuthContext";

function RequireAuth() {
  const { user, loading } = useAuth(); const location = useLocation();
  if (loading) return <div className="loading-state">Loading account…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.mustChangePassword && location.pathname !== "/change-password") return <Navigate to="/change-password" replace />;
  if (user.role === "USER" && !["/reports", "/download-reports", "/change-password"].includes(location.pathname)) return <Navigate to="/reports" replace />;
  if (user.role === "ADMIN" && !["/", "/expenditures", "/my-project-dashboard", "/head-budget-allocation", "/change-password"].includes(location.pathname)) return <Navigate to={user.assignedProjectId ? "/my-project-dashboard" : "/expenditures"} replace />;
  if (location.pathname === "/users" && user.role !== "SUPER_ADMIN") return <Navigate to="/" replace />;
  if (location.pathname === "/audit-logs" && user.role !== "SUPER_ADMIN") return <Navigate to="/" replace />;
  return <Outlet />;
}

function HomeForRole() {
  const { user } = useAuth();
  if (user?.role === "USER") return <Navigate to="/reports" replace />;
  if (user?.role === "ADMIN") return <Navigate to={user.assignedProjectId ? "/my-project-dashboard" : "/expenditures"} replace />;
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider><BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/change-password" element={<ChangePassword />} />
          <Route element={<MainLayout />}>
          <Route path="/" element={<HomeForRole />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/my-project-dashboard" element={<MyProjectDashboard />} />
          <Route path="/head-budget-allocation" element={<BudgetHeadAllocation />} />

          <Route
  path="/ministry-budget"
  element={<MinistryBudget />}
/>
          

          <Route
            path="/categories"
            element={<PlaceholderPage title="Budget Categories" />}
          />
<Route path="/reports" element={<CentralReports />} />
          <Route
  path="/sources"
  element={<BudgetSources />}
/>
<Route
  path="/expense-heads"
  element={<ExpenseHeads />}
/>
          <Route
  path="/offices"
  element={<OfficeManagement />}
/>

          <Route
  path="/office-allocations"
  element={<OfficeAllocation />}
/>
<Route
  path="/office-dashboard"
  element={<OfficeDashboard />}
/>
<Route
  path="/project-dashboard"
  element={<ProjectDashboard />}
/>

   <Route
  path="/projects"
  element={<Projects />}
/>
<Route
  path="/download-reports"
  element={<DownloadReports />}
/>

          <Route path="/expenditures" element={<ExpenditureEntry />} />

          <Route
            path="/fiscal-years"
            element={<FiscalYears />}
          />
        </Route>
        </Route>
      </Routes>
    </BrowserRouter></AuthProvider>
  );
}

export default App;
