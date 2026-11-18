
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={sidebarOpen ? "sidebar-wrapper open" : "sidebar-wrapper"}>
        <Sidebar />
      </div>

      <div className="main-area">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="page-content">
          <Outlet />
        </main>

        <footer className="app-footer">
          © {new Date().getFullYear()} Secondary and Higher Education Division
        </footer>
      </div>
    </div>
  );
}
