import { useEffect, useMemo, useState } from "react";
import {
  Building2,
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
  "Unable to load office dashboard.";

// Each Budget Head has its own cumulative history. Keep the latest
// cumulative record for each head; null head IDs are grouped as legacy.
const summarizeHistoryByHead = (history, expenseHeadMap) => {
  const sorted = [...history].sort((a, b) =>
    String(b.reportDate || "").localeCompare(String(a.reportDate || ""))
  );
  const latestByHead = new Map();

  sorted.forEach((item) => {
    const key =
      item.expenseHeadId == null ? "LEGACY" : String(item.expenseHeadId);
    if (!latestByHead.has(key)) latestByHead.set(key, item);
  });

  const heads = Array.from(latestByHead.entries()).map(([key, item]) => {
    const head = key === "LEGACY" ? null : expenseHeadMap.get(key);
    return {
      key,
      expenseHeadId: item.expenseHeadId ?? null,
      name:
        key === "LEGACY"
          ? "পুরোনো / অনির্ধারিত খাত"
          : head?.nameBn || head?.name || `Budget Head ${key}`,
      code: head?.code || "",
      cumulativeAmount: Number(item.cumulativeAmount || 0),
      latestReportDate: item.reportDate || null,
    };
  });

  return {
    heads,
    expenditure: heads.reduce((sum, item) => sum + item.cumulativeAmount, 0),
    latestReportDate: sorted[0]?.reportDate || null,
  };
};

export default function OfficeDashboard() {
  const [offices, setOffices] = useState([]);
  const [activeFiscalYear, setActiveFiscalYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedOffice, setExpandedOffice] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      setOffices([]);
      setActiveFiscalYear(null);

      // 1. Resolve the active fiscal year from the backend.
      const { activeFiscalYear: activeYear, ministry } =
        await loadActiveMinistryContext();

      setActiveFiscalYear(activeYear);

      // 2. Load the ministry budget for the active fiscal year.
      const budgetResponse = await api.get(
        "/ministry-budgets/by-fiscal-year",
        { params: { fiscalYearId: activeYear.id, organizationId: ministry.id } }
      );
      const budgetData = budgetResponse.data;
      const budget = Array.isArray(budgetData) ? budgetData[0] : budgetData;

      if (!budget?.id) {
        throw new Error("No ministry budget found for this fiscal year.");
      }

      // 3. Load organization hierarchy and flatten it for office names.
      const [organizationResponse, categoryResponse, expenseHeadResponse] =
        await Promise.all([
          api.get("/organizations/hierarchy"),
          api.get(`/ministry-budgets/${budget.id}/categories`),
          api.get("/expense-heads"),
        ]);

      const organizationMap = new Map();
      const flattenOrganizations = (items) => {
        items.forEach((item) => {
          organizationMap.set(String(item.id), item);
          if (Array.isArray(item.children)) flattenOrganizations(item.children);
        });
      };
      flattenOrganizations(getArray(organizationResponse.data));

      const expenseHeadMap = new Map(
        getArray(expenseHeadResponse.data).map((head) => [
          String(head.id),
          head,
        ])
      );

      const categories = getArray(categoryResponse.data);
      const officeMap = new Map();

      const ensureOffice = (allocation) => {
        const officeId = String(allocation.organizationId);
        const organization = organizationMap.get(officeId);
        if (!officeMap.has(officeId)) {
          officeMap.set(officeId, {
            officeId: allocation.organizationId,
            officeName:
              organization?.nameBn ||
              organization?.name ||
              `Office ${allocation.organizationId}`,
            allocated: 0,
            expenditure: 0,
            allocations: [],
          });
        }
        return officeMap.get(officeId);
      };

      // 4. Office Dashboard shows OPERATIONAL expenditure only.
      // Development / ADP / BLOCK project expenditure remains in Project Dashboard.
      const operationalCategory = categories.find(
        (category) => category.categoryCode === "OPERATIONAL"
      );

      if (!operationalCategory) {
        setOffices([]);
        return;
      }

      const sourceResponse = await api.get(
        `/budget-categories/${operationalCategory.id}/sources`
      );
      const sources = getArray(sourceResponse.data);
    //   const officeMap = new Map();

      for (const source of sources) {
        const allocationResponse = await api.get(
          `/budget-sources/${source.id}/offices`
        );
        const allocations = getArray(allocationResponse.data);

        for (const allocation of allocations) {
          const officeId = String(allocation.organizationId);
          const organization = organizationMap.get(officeId);

          if (!officeMap.has(officeId)) {
            officeMap.set(officeId, {
              officeId: allocation.organizationId,
              officeName:
                organization?.nameBn ||
                organization?.name ||
                `Office ${allocation.organizationId}`,
              allocated: 0,
              expenditure: 0,
              allocations: [],
            });
          }

          const office = officeMap.get(officeId);
          const allocatedAmount = Number(allocation.allocatedAmount || 0);

          let history = [];
          let historyErrorMessage = "";
          try {
            const historyResponse = await api.get(
              `/office-allocations/${allocation.id}/expenditures`
            );
            history = getArray(historyResponse.data);
            console.log(
              `[Office Dashboard] Allocation ID ${allocation.id}:`,
              history
            );
          } catch (historyError) {
            historyErrorMessage = getError(historyError);
            console.error(
              `Unable to load operational expenditure history for allocation ${allocation.id}`,
              historyError
            );
          }

          const summary = summarizeHistoryByHead(history, expenseHeadMap);
          const allocationDetail = {
            id: allocation.id,
            categoryCode: "OPERATIONAL",
            categoryName: operationalCategory.categoryName || "Operational",
            sourceCode: source.sourceCode || "",
            sourceName: source.sourceName || "Operational",
            allocatedAmount,
            expenditure: summary.expenditure,
            remaining: allocatedAmount - summary.expenditure,
            heads: summary.heads,
            history,
            historyErrorMessage,
            latestReportDate: summary.latestReportDate,
          };

          office.allocated += allocatedAmount;
          office.expenditure += summary.expenditure;
          office.allocations.push(allocationDetail);
        }
      }

      const officeRows = Array.from(officeMap.values())
        .map((office) => ({
          ...office,
          remaining: office.allocated - office.expenditure,
          utilization:
            office.allocated > 0
              ? (office.expenditure / office.allocated) * 100
              : 0,
          latestReportDate:
            office.allocations
              .map((item) => item.latestReportDate)
              .filter(Boolean)
              .sort()
              .at(-1) || null,
        }))
        .sort((a, b) => a.officeName.localeCompare(b.officeName, "bn"));

      setOffices(officeRows);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredOffices = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return offices;
    return offices.filter((office) =>
      office.officeName?.toLowerCase().includes(keyword)
    );
  }, [offices, search]);

  const stats = useMemo(() => {
    const allocated = offices.reduce((sum, office) => sum + office.allocated, 0);
    const expenditure = offices.reduce(
      (sum, office) => sum + office.expenditure,
      0
    );
    return {
      totalOffices: offices.length,
      allocated,
      expenditure,
      remaining: allocated - expenditure,
      utilization: allocated > 0 ? (expenditure / allocated) * 100 : 0,
    };
  }, [offices]);

  const styles = {
    page: { padding: "24px", maxWidth: "1450px", margin: "0 auto" },
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
    subtitle: { color: "#64748b", marginTop: "7px", marginBottom: "24px" },
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
    statLabel: { color: "#64748b", fontSize: "13px" },
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
    tableWrap: { overflowX: "auto" },
    table: { width: "100%", minWidth: "850px", borderCollapse: "collapse" },
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
      verticalAlign: "top",
    },
    progress: {
      height: "7px",
      background: "#e2e8f0",
      borderRadius: "10px",
      overflow: "hidden",
      minWidth: "75px",
      marginTop: "6px",
    },
    detailBox: {
      background: "#f8fafc",
      padding: "15px",
      borderRadius: "8px",
      margin: "0 10px 14px",
    },
    smallHeading: {
      fontSize: "15px",
      fontWeight: 700,
      margin: "12px 0 8px",
      color: "#0f172a",
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
    return <div style={styles.page}>Loading office dashboard...</div>;
  }

  if (error && offices.length === 0) {
    return (
      <div style={styles.page}>
        <h1 style={styles.heading}>Office Dashboard</h1>
        <div style={{ ...styles.card, color: "#b91c1c" }}>{error}</div>
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
          <h1 style={styles.heading}>Office Dashboard</h1>
          <p style={styles.subtitle}>
            Office-wise operational budget and expenditure overview.
            {activeFiscalYear?.name
              ? ` Active Fiscal Year: ${activeFiscalYear.name}`
              : ""}
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
        <div style={{ ...styles.card, color: "#b91c1c" }}>{error}</div>
      )}

      <div style={styles.statsGrid}>
        <StatCard
          label="Total Offices"
          value={number(stats.totalOffices)}
          icon={Building2}
        />
        <StatCard
          label="Total Operational Allocation"
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
        <h2 style={{ fontSize: "18px", marginTop: 0 }}>
          Search Offices
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
              placeholder="Search office name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
            All Offices — Operational Expenditure
          </h2>
          <span style={{ color: "#64748b", fontSize: "13px" }}>
            {filteredOffices.length} offices
          </span>
        </div>

        {filteredOffices.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            No offices found for the active fiscal year.
          </p>
        ) : (
          filteredOffices.map((office) => {
            const expanded = expandedOffice === String(office.officeId);
            return (
              <div key={office.officeId} style={{ marginBottom: "14px" }}>
                <div style={styles.officeHeader}>
                  <div style={{ flex: "1 1 240px" }}>
                    <strong style={{ color: "#1e3a8a" }}>
                      {office.officeName}
                    </strong>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "5px",
                      }}
                    >
                      {office.allocations.length} budget allocations
                    </div>
                    <div style={{ ...styles.progress, maxWidth: "260px" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(
                            Math.max(office.utilization, 0),
                            100
                          )}%`,
                          background:
                            office.utilization > 90 ? "#dc2626" : "#2563eb",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: "12px", color: "#334155" }}>
                    Allocation: <strong>{money(office.allocated)}</strong>
                    {" | "}
                    Expenditure: <strong>{money(office.expenditure)}</strong>
                    {" | "}
                    Remaining: <strong>{money(office.remaining)}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedOffice(
                        expanded ? null : String(office.officeId)
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
                      padding: "6px",
                    }}
                  >
                    {expanded ? (
                      <>
                        Hide <ChevronUp size={15} />
                      </>
                    ) : (
                      <>
                        View Details <ChevronDown size={15} />
                      </>
                    )}
                  </button>
                </div>

                {expanded && (
                  <div style={styles.detailBox}>
                    <strong>
                      Operational Expenditure Details — {office.officeName}
                    </strong>

                    {office.allocations.length === 0 ? (
                      <p style={{ color: "#64748b" }}>
                        No allocation details available.
                      </p>
                    ) : (
                      office.allocations.map((allocation) => (
                        <div
                          key={allocation.id}
                          style={{
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "13px",
                            marginTop: "12px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "8px",
                            }}
                          >
                            <div>
                              <strong>
                                {allocation.categoryName} — {allocation.sourceName}
                              </strong>
                              <div
                                style={{
                                  color: "#64748b",
                                  fontSize: "12px",
                                  marginTop: "4px",
                                }}
                              >
                                Allocation ID: {allocation.id}
                                {" | "}
                                Latest Report: {allocation.latestReportDate || "No report"}
                              </div>
                            </div>
                            <div style={{ fontSize: "12px" }}>
                              Allocation: <strong>{money(allocation.allocatedAmount)}</strong>
                              {" | "}
                              Expenditure: <strong>{money(allocation.expenditure)}</strong>
                              {" | "}
                              Remaining: <strong>{money(allocation.remaining)}</strong>
                            </div>
                          </div>

                          <div style={styles.smallHeading}>Budget Head-wise Expenditure</div>
                          {allocation.heads.length === 0 ? (
                            <p style={{ color: "#64748b", fontSize: "13px" }}>
                              No expenditure history available.
                            </p>
                          ) : (
                            <div style={styles.tableWrap}>
                              <table style={{ ...styles.table, minWidth: "650px" }}>
                                <thead>
                                  <tr>
                                    <th style={styles.th}>Budget Head</th>
                                    <th style={styles.th}>Code</th>
                                    <th style={styles.th}>Cumulative Expenditure</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allocation.heads.map((head, index) => (
                                    <tr key={`${head.key}-${head.projectName || index}`}>
                                      <td style={styles.td}>{head.name}</td>
                                      <td style={styles.td}>{head.code || "—"}</td>
                                      <td style={styles.td}>{money(head.cumulativeAmount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div style={styles.smallHeading}>Expenditure History</div>
                          {allocation.historyErrorMessage ? (
                            <p style={{ color: "#b91c1c", fontSize: "13px" }}>
                              Could not load expenditure history: {allocation.historyErrorMessage}
                            </p>
                          ) : allocation.history.length === 0 ? (
                            <p style={{ color: "#64748b", fontSize: "13px" }}>
                              No expenditure history available for Allocation ID {allocation.id}.
                            </p>
                          ) : (
                            <div style={styles.tableWrap}>
                              <table style={{ ...styles.table, minWidth: "850px" }}>
                                <thead>
                                  <tr>
                                    <th style={styles.th}>Report Date</th>
                                    <th style={styles.th}>Budget Head</th>
                                    <th style={styles.th}>Cumulative Amount</th>
                                    <th style={styles.th}>Daily Expenditure</th>
                                    <th style={styles.th}>Remarks</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...allocation.history]
                                    .sort((a, b) =>
                                      String(b.reportDate || "").localeCompare(String(a.reportDate || ""))
                                    )
                                    .map((item) => {
                                      const head =
                                        item.expenseHeadId == null
                                          ? null
                                          : expenseHeadMapForRender(item.expenseHeadId, allocation.heads);
                                      return (
                                        <tr key={`${item.id}-${item.projectName || ""}`}>
                                          <td style={styles.td}>{item.reportDate}</td>
                                          <td style={styles.td}>
                                            {item.expenseHeadId == null
                                              ? "পুরোনো / অনির্ধারিত খাত"
                                              : head?.name || `Budget Head ${item.expenseHeadId}`}
                                          </td>
                                          <td style={styles.td}>{money(item.cumulativeAmount)}</td>
                                          <td style={styles.td}>{money(item.incrementalAmount)}</td>
                                          <td style={styles.td}>{item.remarks || "—"}</td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Resolve the head label for a history row using the already loaded head summaries.
function expenseHeadMapForRender(expenseHeadId, heads) {
  const found = heads.find(
    (head) => String(head.expenseHeadId) === String(expenseHeadId)
  );
  return found ? { name: found.name } : null;
}
