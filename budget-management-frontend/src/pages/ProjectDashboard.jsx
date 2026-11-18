
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  Wallet,
  TrendingUp,
  CircleDollarSign,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../api/axios";
import { loadActiveMinistryContext } from "../services/budgetContext";

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const number = (value) =>
  new Intl.NumberFormat("en-BD").format(Number(value || 0));

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getError = (error) =>
  error.response?.data?.message ||
  error.response?.data?.error ||
  error.message ||
  "Unable to load project dashboard.";

export default function ProjectDashboard() {
  const [projects, setProjects] = useState([]);
  const [activeFiscalYear, setActiveFiscalYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("ALL");
  const [expandedProject, setExpandedProject] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      setActiveFiscalYear(null);
      setProjects([]);

      // 1. Always resolve the currently active fiscal year from the backend.
      const { activeFiscalYear: activeYear, ministry } =
        await loadActiveMinistryContext();

      setActiveFiscalYear(activeYear);
      const fiscalYearId = activeYear.id;

      // 2. Get Ministry Budget for the active fiscal year only.
      const budgetResponse = await api.get(
        "/ministry-budgets/by-fiscal-year",
        { params: { fiscalYearId, organizationId: ministry.id } }
      );

      const budgetData = budgetResponse.data;
      const budget = Array.isArray(budgetData)
        ? budgetData[0]
        : budgetData;

      if (!budget?.id) {
        throw new Error("No ministry budget found for this fiscal year.");
      }

      // 3. Get organization hierarchy
      const organizationResponse = await api.get("/organizations/hierarchy");
      const organizations = getArray(organizationResponse.data);

      const organizationMap = new Map();

      const flattenOrganizations = (items) => {
        items.forEach((item) => {
          organizationMap.set(String(item.id), item);

          if (Array.isArray(item.children)) {
            flattenOrganizations(item.children);
          }
        });
      };

      flattenOrganizations(organizations);

      // 4. Get budget categories
      const categoryResponse = await api.get(
        `/ministry-budgets/${budget.id}/categories`
      );

      const categories = getArray(categoryResponse.data);

      const developmentCategory = categories.find(
        (item) => item.categoryCode === "DEVELOPMENT"
      );

      if (!developmentCategory) {
        setProjects([]);
        return;
      }

      // 5. Get Development sources
      const sourceResponse = await api.get(
        `/budget-categories/${developmentCategory.id}/sources`
      );

      const sources = getArray(sourceResponse.data);

      const adpSource = sources.find(
        (item) => item.sourceCode === "ADP"
      );

      if (!adpSource) {
        setProjects([]);
        return;
      }

      // 6. Get ADP office allocations
      const allocationResponse = await api.get(
        `/budget-sources/${adpSource.id}/offices`
      );

      const allocations = getArray(allocationResponse.data);

      // 7. Get projects and expenditure history for offices in the active year's ADP allocation.
      const projectResults = await Promise.all(
        allocations.map(async (allocation) => {
          const office = organizationMap.get(
            String(allocation.organizationId)
          );

          const officeName =
            office?.nameBn ||
            office?.name ||
            `Office ${allocation.organizationId}`;

          const response = await api.get(
            `/office-allocations/${allocation.id}/projects`
          );

          const officeProjects = getArray(response.data);

          return Promise.all(
            officeProjects.map(async (project) => {
              let history = [];

              try {
                const historyResponse = await api.get(
                  `/projects/${project.id}/expenditures`
                );

                history = getArray(historyResponse.data);
              } catch (historyError) {
                console.error(
                  `Unable to load history for project ${project.id}`,
                  historyError
                );
              }

              const allocated = Number(project.allocatedAmount || 0);

              // Sort history by report date, newest first.
              const sortedHistory = [...history].sort((a, b) =>
                String(b.reportDate || "").localeCompare(
                  String(a.reportDate || "")
                )
              );

              // Keep the latest cumulative record for each Budget Head.
              // Old records with null expenseHeadId are retained as one legacy group.
              const latestByHead = new Map();

              sortedHistory.forEach((item) => {
                const headKey =
                  item.expenseHeadId == null
                    ? "LEGACY"
                    : String(item.expenseHeadId);

                if (!latestByHead.has(headKey)) {
                  latestByHead.set(headKey, item);
                }
              });

              // Project expenditure is the sum of the latest cumulative
              // amount for every Budget Head, not just the latest row.
              const expenditure = Array.from(latestByHead.values()).reduce(
                (total, item) =>
                  total + Number(item.cumulativeAmount || 0),
                0
              );

              const latestReportDate =
                sortedHistory[0]?.reportDate || null;

              const remaining = allocated - expenditure;
              const utilization =
                allocated > 0 ? (expenditure / allocated) * 100 : 0;

              return {
                ...project,
                officeId: allocation.organizationId,
                officeName,
                officeAllocationId: allocation.id,
                officeAllocatedAmount: Number(
                  allocation.allocatedAmount || 0
                ),
                allocated,
                expenditure,
                remaining,
                utilization,
                latestReportDate,
                history,
              };
            })
          );
        })
      );

      setProjects(projectResults.flat());
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Office dropdown options
  const offices = useMemo(() => {
    const map = new Map();

    projects.forEach((project) => {
      map.set(String(project.officeId), project.officeName);
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [projects]);

  // Search and office filter
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesOffice =
        selectedOffice === "ALL" ||
        String(project.officeId) === selectedOffice;

      const keyword = search.toLowerCase();

      const matchesSearch =
        !keyword ||
        project.projectName?.toLowerCase().includes(keyword) ||
        project.projectNameBn?.toLowerCase().includes(keyword) ||
        project.projectCode?.toLowerCase().includes(keyword) ||
        project.officeName?.toLowerCase().includes(keyword);

      return matchesOffice && matchesSearch;
    });
  }, [projects, selectedOffice, search]);

  // Overall statistics based on all projects
  const stats = useMemo(() => {
    const allocated = projects.reduce(
      (sum, project) => sum + project.allocated,
      0
    );

    const expenditure = projects.reduce(
      (sum, project) => sum + project.expenditure,
      0
    );

    return {
      totalProjects: projects.length,
      allocated,
      expenditure,
      remaining: allocated - expenditure,
      utilization: allocated > 0 ? (expenditure / allocated) * 100 : 0,
    };
  }, [projects]);

  // Office-wise grouping
  const officeGroups = useMemo(() => {
    const groups = new Map();

    filteredProjects.forEach((project) => {
      if (!groups.has(String(project.officeId))) {
        groups.set(String(project.officeId), {
          officeId: project.officeId,
          officeName: project.officeName,
          projects: [],
        });
      }

      groups.get(String(project.officeId)).projects.push(project);
    });

    return Array.from(groups.values());
  }, [filteredProjects]);

  const styles = {
    page: {
      padding: "24px",
      maxWidth: "1450px",
      margin: "0 auto",
    },
    headingRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "15px",
      marginBottom: "6px",
    },
    heading: {
      fontSize: "25px",
      fontWeight: 700,
      color: "#0f172a",
      margin: 0,
    },
    subtitle: {
      color: "#64748b",
      marginTop: "7px",
      marginBottom: "24px",
    },
    button: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "#1d4ed8",
      color: "#fff",
      padding: "10px 15px",
      border: 0,
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: 600,
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
      gap: "16px",
      marginBottom: "22px",
    },
    statCard: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "18px",
    },
    statTop: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "13px",
    },
    statLabel: {
      color: "#64748b",
      fontSize: "13px",
    },
    statValue: {
      color: "#0f172a",
      fontSize: "21px",
      fontWeight: 700,
      overflowWrap: "anywhere",
    },
    iconBox: {
      background: "#eff6ff",
      color: "#1d4ed8",
      padding: "9px",
      borderRadius: "9px",
    },
    card: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "20px",
    },
    filterGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "14px",
    },
    input: {
      width: "100%",
      padding: "11px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: "7px",
      boxSizing: "border-box",
      background: "#fff",
      fontSize: "14px",
    },
    officeHeader: {
      padding: "15px 18px",
      background: "#eff6ff",
      borderRadius: "9px",
      marginBottom: "12px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "8px",
    },
    tableWrap: {
      overflowX: "auto",
    },
    table: {
      width: "100%",
      minWidth: "850px",
      borderCollapse: "collapse",
    },
    th: {
      background: "#f8fafc",
      color: "#475569",
      fontSize: "12px",
      textAlign: "left",
      padding: "13px 11px",
      borderBottom: "1px solid #e2e8f0",
    },
    td: {
      padding: "13px 11px",
      fontSize: "13px",
      borderBottom: "1px solid #e2e8f0",
      color: "#334155",
    },
    progress: {
      height: "7px",
      background: "#e2e8f0",
      borderRadius: "10px",
      overflow: "hidden",
      minWidth: "75px",
      marginTop: "6px",
    },
    historyBox: {
      background: "#f8fafc",
      padding: "15px",
      borderRadius: "8px",
      margin: "0 10px 12px",
    },
  };

  const StatCard = ({ label, value, icon: Icon }) => (
    <div style={styles.statCard}>
      <div style={styles.statTop}>
        <span style={styles.statLabel}>{label}</span>
        <span style={styles.iconBox}>
          <Icon size={20} />
        </span>
      </div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );

  if (loading) {
    return (
      <div style={styles.page}>
        Loading project dashboard...
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div style={styles.page}>
        <h1 style={styles.heading}>Project Dashboard</h1>
        <div style={{ ...styles.card, color: "#b91c1c" }}>
          {error}
        </div>
        <button style={styles.button} onClick={loadDashboard}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headingRow}>
        <div>
          <h1 style={styles.heading}>Project Dashboard</h1>
          <p style={styles.subtitle}>
            Office-wise project budget and expenditure overview.
            {activeFiscalYear?.name ? ` Active Fiscal Year: ${activeFiscalYear.name}` : ""}
          </p>
        </div>

        <button
          style={styles.button}
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ ...styles.card, color: "#b91c1c" }}>
          {error}
        </div>
      )}

      <div style={styles.statsGrid}>
        <StatCard
          label="Total Projects"
          value={number(stats.totalProjects)}
          icon={FolderKanban}
        />
        <StatCard
          label="Total Project Allocation"
          value={money(stats.allocated)}
          icon={Wallet}
        />
        <StatCard
          label="Total Expenditure"
          value={money(stats.expenditure)}
          icon={TrendingUp}
        />
        <StatCard
          label="Remaining Budget"
          value={money(stats.remaining)}
          icon={CircleDollarSign}
        />
      </div>

      <div style={styles.card}>
        <div style={styles.statTop}>
          <div>
            <h2 style={{ fontSize: "18px", margin: 0 }}>
              Budget Utilization
            </h2>
            <p style={{ color: "#64748b", fontSize: "13px" }}>
              Overall project expenditure against allocated budget
            </p>
          </div>
          <strong style={{ fontSize: "22px", color: "#1d4ed8" }}>
            {stats.utilization.toFixed(2)}%
          </strong>
        </div>

        <div style={{ ...styles.progress, height: "12px" }}>
          <div
            style={{
              width: `${Math.min(Math.max(stats.utilization, 0), 100)}%`,
              height: "100%",
              background: "#2563eb",
              borderRadius: "10px",
            }}
          />
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={{ fontSize: "18px", marginTop: 0 }}>
          Search and Filter Projects
        </h2>

        <div style={styles.filterGrid}>
          <div style={{ position: "relative" }}>
            <Search
              size={17}
              style={{
                position: "absolute",
                left: "11px",
                top: "12px",
                color: "#94a3b8",
              }}
            />
            <input
              style={{ ...styles.input, paddingLeft: "36px" }}
              placeholder="Search project or office..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            style={styles.input}
            value={selectedOffice}
            onChange={(e) => setSelectedOffice(e.target.value)}
          >
            <option value="ALL">All Offices</option>
            {offices.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
            gap: "10px",
          }}
        >
          <h2 style={{ fontSize: "18px", margin: 0 }}>
            Office-wise Project Overview
          </h2>
          <span style={{ color: "#64748b", fontSize: "13px" }}>
            {filteredProjects.length} projects
          </span>
        </div>

        {officeGroups.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            No projects found for this filter.
          </p>
        ) : (
          officeGroups.map((group) => {
            const officeAllocated = group.projects.reduce(
              (sum, project) => sum + project.allocated,
              0
            );

            const officeExpenditure = group.projects.reduce(
              (sum, project) => sum + project.expenditure,
              0
            );

            const officeRemaining =
              officeAllocated - officeExpenditure;

            return (
              <div key={group.officeId} style={{ marginBottom: "24px" }}>
                <div style={styles.officeHeader}>
                  <div>
                    <strong style={{ color: "#1e3a8a" }}>
                      {group.officeName}
                    </strong>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "5px",
                      }}
                    >
                      {group.projects.length} Projects
                    </div>
                  </div>

                  <div style={{ fontSize: "12px", color: "#334155" }}>
                    Allocation: <strong>{money(officeAllocated)}</strong>
                    {" | "}
                    Expenditure: <strong>{money(officeExpenditure)}</strong>
                    {" | "}
                    Remaining: <strong>{money(officeRemaining)}</strong>
                  </div>
                </div>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Project</th>
                        <th style={styles.th}>Allocated Budget</th>
                        <th style={styles.th}>Expenditure</th>
                        <th style={styles.th}>Remaining</th>
                        <th style={styles.th}>Utilization</th>
                        <th style={styles.th}>Latest Report</th>
                        <th style={styles.th}>History</th>
                      </tr>
                    </thead>

                    <tbody>
                      {group.projects.map((project) => {
                        const expanded =
                          expandedProject === String(project.id);

                        return (
                          <Fragment key={project.id}>
                            <tr>
                              <td style={styles.td}>
                                <strong>{project.projectName}</strong>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#64748b",
                                    marginTop: "4px",
                                  }}
                                >
                                  {project.projectCode}
                                </div>
                              </td>

                              <td style={styles.td}>
                                {money(project.allocated)}
                              </td>

                              <td style={styles.td}>
                                {money(project.expenditure)}
                              </td>

                              <td style={styles.td}>
                                <strong
                                  style={{
                                    color:
                                      project.remaining < 0
                                        ? "#dc2626"
                                        : "#15803d",
                                  }}
                                >
                                  {money(project.remaining)}
                                </strong>
                              </td>

                              <td style={styles.td}>
                                <strong>
                                  {project.utilization.toFixed(2)}%
                                </strong>
                                <div style={styles.progress}>
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${Math.min(
                                        Math.max(project.utilization, 0),
                                        100
                                      )}%`,
                                      background:
                                        project.utilization > 90
                                          ? "#dc2626"
                                          : "#2563eb",
                                    }}
                                  />
                                </div>
                              </td>

                              <td style={styles.td}>
                                {project.latestReportDate || "No report"}
                              </td>

                              <td style={styles.td}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedProject(
                                      expanded ? null : String(project.id)
                                    )
                                  }
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    border: 0,
                                    background: "transparent",
                                    color: "#1d4ed8",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                  }}
                                >
                                  {expanded ? (
                                    <>
                                      Hide <ChevronUp size={15} />
                                    </>
                                  ) : (
                                    <>
                                      View <ChevronDown size={15} />
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>

                            {expanded && (
                              <tr key={`${project.id}-history`}>
                                <td colSpan="7" style={{ padding: 0 }}>
                                  <div style={styles.historyBox}>
                                    <strong>Expenditure History — {project.projectName}</strong>

                                    {project.history.length === 0 ? (
                                      <p style={{ color: "#64748b" }}>
                                        No expenditure history available.
                                      </p>
                                    ) : (
                                      <div
                                        style={{
                                          ...styles.tableWrap,
                                          marginTop: "10px",
                                        }}
                                      >
                                        <table style={styles.table}>
                                          <thead>
                                            <tr>
                                              <th style={styles.th}>Report Date</th>
                                              <th style={styles.th}>Cumulative Amount</th>
                                              <th style={styles.th}>Incremental Amount</th>
                                              <th style={styles.th}>Remarks</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {project.history.map((item) => (
                                              <tr key={item.id}>
                                                <td style={styles.td}>
                                                  {item.reportDate}
                                                </td>
                                                <td style={styles.td}>
                                                  {money(item.cumulativeAmount)}
                                                </td>
                                                <td style={styles.td}>
                                                  {money(item.incrementalAmount)}
                                                </td>
                                                <td style={styles.td}>
                                                  {item.remarks || "—"}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
