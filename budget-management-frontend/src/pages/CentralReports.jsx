
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Wallet,
  TrendingUp,
  Building2,
  FolderKanban,
  RefreshCw,
  Search,
  Download,
} from "lucide-react";
import api from "../api/axios";
import { loadActiveMinistryContext } from "../services/budgetContext";

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

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
  "Unable to load report data.";

const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Expenditure history stores the amount added by each dated entry.
const calculatePeriodExpenditure = (history, fromDate, toDate) => {
  return history
    .filter((item) => item.reportDate >= fromDate && item.reportDate <= toDate)
    .reduce((sum, item) => sum + Number(item.incrementalAmount || 0), 0);
};

export default function CentralReports() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeFiscalYear, setActiveFiscalYear] = useState(null);

  const [reportType, setReportType] = useState("ALL");
  const [search, setSearch] = useState("");

  const [projectRecords, setProjectRecords] = useState([]);
  const [officeRecords, setOfficeRecords] = useState([]);
  const [expenseHeadNames, setExpenseHeadNames] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError("");

      // Resolve the active fiscal year dynamically from the database.
      const { activeFiscalYear: currentActiveYear, ministry } =
        await loadActiveMinistryContext();

      if (!currentActiveYear?.id) {
        throw new Error("কোনো Active Fiscal Year পাওয়া যায়নি।");
      }

      setActiveFiscalYear(currentActiveYear);

      // Keep the selected report period inside the active fiscal year.
      const today = localDate(new Date());
      const defaultFrom = currentActiveYear.startDate;
      const defaultTo =
        today < currentActiveYear.endDate ? today : currentActiveYear.endDate;

      const nextFrom =
        fromDate && fromDate >= currentActiveYear.startDate &&
        fromDate <= currentActiveYear.endDate
          ? fromDate
          : defaultFrom;

      const nextTo =
        toDate && toDate >= nextFrom && toDate <= currentActiveYear.endDate
          ? toDate
          : (defaultTo >= nextFrom ? defaultTo : currentActiveYear.endDate);

      setFromDate(nextFrom);
      setToDate(nextTo);

      // 1. Load ministry budget for the active fiscal year
      const budgetResponse = await api.get(
        "/ministry-budgets/by-fiscal-year",
        { params: { fiscalYearId: currentActiveYear.id, organizationId: ministry.id } }
      );

      const budgetData = budgetResponse.data;
      const budget = Array.isArray(budgetData)
        ? budgetData[0]
        : budgetData;

      if (!budget?.id) {
        throw new Error("No ministry budget found for this fiscal year.");
      }

      // 2. Load organization hierarchy
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

      const expenseHeadResponse = await api.get("/expense-heads");
      setExpenseHeadNames(Object.fromEntries(getArray(expenseHeadResponse.data).map((head) => [
        String(head.id), `${head.code ? `${head.code} — ` : ""}${head.nameBn || head.name || "Budget head"}`,
      ])));

      // 3. Load categories
      const categoryResponse = await api.get(
        `/ministry-budgets/${budget.id}/categories`
      );
      const categories = getArray(categoryResponse.data);

      const projectRows = [];
      const officeRows = [];

      // 4. Load source and allocation information
      for (const category of categories) {
        if (
          category.categoryCode !== "OPERATIONAL" &&
          category.categoryCode !== "DEVELOPMENT"
        ) {
          continue;
        }

        const sourceResponse = await api.get(
          `/budget-categories/${category.id}/sources`
        );
        const sources = getArray(sourceResponse.data);

        for (const source of sources) {
          const isDevelopmentADP =
            category.categoryCode === "DEVELOPMENT" &&
            source.sourceCode === "ADP";

          const isOperational =
            category.categoryCode === "OPERATIONAL";

          const isDevelopmentBlock =
            category.categoryCode === "DEVELOPMENT" &&
            source.sourceCode === "BLOCK";

          // Only these three expenditure types are included.
          if (
            !isDevelopmentADP &&
            !isOperational &&
            !isDevelopmentBlock
          ) {
            continue;
          }

          const allocationResponse = await api.get(
            `/budget-sources/${source.id}/offices`
          );

          const allocations = getArray(allocationResponse.data);

          for (const allocation of allocations) {
            const office = organizationMap.get(
              String(allocation.organizationId)
            );

            const officeName =
              office?.nameBn ||
              office?.name ||
              `Office ${allocation.organizationId}`;

            if (isDevelopmentADP) {
              // ADP expenditure is counted from projects, not office history.
              const projectResponse = await api.get(
                `/office-allocations/${allocation.id}/projects`
              );

              const projects = getArray(projectResponse.data);

              const rows = await Promise.all(
                projects.map(async (project) => {
                  const historyResponse = await api.get(
                    `/projects/${project.id}/expenditures`
                  );

                  return {
                    id: `PROJECT-${project.id}`,
                    recordId: project.id,
                    type: "PROJECT",
                    categoryCode: "DEVELOPMENT",
                    categoryName: category.categoryName,
                    sourceCode: "ADP",
                    sourceName: source.sourceName,
                    officeId: allocation.organizationId,
                    officeName,
                    name:
                      project.projectNameBn ||
                      project.projectName,
                    code: project.projectCode,
                    allocatedAmount: Number(
                      project.allocatedAmount || 0
                    ),
                    history: getArray(historyResponse.data),
                  };
                })
              );

              projectRows.push(...rows);
            } else {
              // Operational and Development BLOCK expenditure is counted
              // from office expenditure history.
              const historyResponse = await api.get(
                `/office-allocations/${allocation.id}/expenditures`
              );

              officeRows.push({
                id: `OFFICE-${allocation.id}`,
                recordId: allocation.id,
                type: "OFFICE",
                categoryCode: category.categoryCode,
                categoryName: category.categoryName,
                sourceCode: source.sourceCode,
                sourceName: source.sourceName,
                officeId: allocation.organizationId,
                officeName,
                name: officeName,
                allocatedAmount: Number(
                  allocation.allocatedAmount || 0
                ),
                history: getArray(historyResponse.data),
              });
            }
          }
        }
      }

      setProjectRecords(projectRows);
      setOfficeRecords(officeRows);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const reportRows = useMemo(() => {
    if (!fromDate || !toDate || fromDate > toDate) return [];

    const allRows = [...projectRecords, ...officeRecords];

    return allRows.map((item) => ({
      ...item,
      expenditure: calculatePeriodExpenditure(
        item.history,
        fromDate,
        toDate
      ),
    }));
  }, [projectRecords, officeRecords, fromDate, toDate]);

  const filteredRows = useMemo(() => {
    return reportRows.filter((item) => {
      const matchesType =
        reportType === "ALL" || item.categoryCode === reportType;

      const keyword = search.toLowerCase();

      const matchesSearch =
        !keyword ||
        item.officeName?.toLowerCase().includes(keyword) ||
        item.name?.toLowerCase().includes(keyword) ||
        item.code?.toLowerCase().includes(keyword) ||
        item.sourceName?.toLowerCase().includes(keyword);

      return matchesType && matchesSearch;
    });
  }, [reportRows, reportType, search]);

  const totals = useMemo(() => {
    const project = filteredRows
      .filter((item) => item.type === "PROJECT")
      .reduce((sum, item) => sum + item.expenditure, 0);

    const operational = filteredRows
      .filter((item) => item.categoryCode === "OPERATIONAL")
      .reduce((sum, item) => sum + item.expenditure, 0);

    const block = filteredRows
      .filter(
        (item) =>
          item.categoryCode === "DEVELOPMENT" &&
          item.sourceCode === "BLOCK"
      )
      .reduce((sum, item) => sum + item.expenditure, 0);

    return {
      project,
      operational,
      block,
      development: project + block,
      total: project + operational + block,
    };
  }, [filteredRows]);

  const entryRows = useMemo(() => filteredRows
    .flatMap((item) => item.history
      .filter((entry) => entry.reportDate >= fromDate && entry.reportDate <= toDate)
      .map((entry) => ({
        ...entry,
        parent: item,
        amount: Number(entry.incrementalAmount || 0),
        headName: entry.expenseHeadId == null
          ? "Legacy / unspecified head"
          : expenseHeadNames[String(entry.expenseHeadId)] || `Budget Head ${entry.expenseHeadId}`,
      })))
    .sort((a, b) => String(b.reportDate).localeCompare(String(a.reportDate)) || Number(b.id || 0) - Number(a.id || 0)),
  [filteredRows, fromDate, toDate, expenseHeadNames]);

  const officeSummary = useMemo(() => {
    const map = new Map();

    filteredRows.forEach((item) => {
      const key = String(item.officeId);

      if (!map.has(key)) {
        map.set(key, {
          officeId: item.officeId,
          officeName: item.officeName,
          operational: 0,
          developmentADP: 0,
          developmentBlock: 0,
          total: 0,
        });
      }

      const row = map.get(key);

      if (item.categoryCode === "OPERATIONAL") {
        row.operational += item.expenditure;
      } else if (
        item.categoryCode === "DEVELOPMENT" &&
        item.sourceCode === "ADP"
      ) {
        row.developmentADP += item.expenditure;
      } else if (
        item.categoryCode === "DEVELOPMENT" &&
        item.sourceCode === "BLOCK"
      ) {
        row.developmentBlock += item.expenditure;
      }

      row.total =
        row.operational +
        row.developmentADP +
        row.developmentBlock;
    });

    return Array.from(map.values()).sort(
      (a, b) => b.total - a.total
    );
  }, [filteredRows]);

  const styles = {
    page: { padding: "24px", maxWidth: "1450px", margin: "0 auto" },
    heading: { fontSize: "25px", fontWeight: 700, margin: 0 },
    subtitle: { color: "#64748b", margin: "7px 0 24px" },
    card: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "20px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
      gap: "15px",
    },
    label: {
      display: "block",
      fontSize: "13px",
      fontWeight: 600,
      color: "#475569",
      marginBottom: "7px",
    },
    input: {
      width: "100%",
      padding: "11px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: "7px",
      boxSizing: "border-box",
      background: "#fff",
    },
    stat: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "18px",
    },
    statLabel: { color: "#64748b", fontSize: "13px" },
    statValue: {
      color: "#0f172a",
      fontSize: "20px",
      fontWeight: 700,
      marginTop: "12px",
      overflowWrap: "anywhere",
    },
    tableWrap: { overflowX: "auto" },
    table: { width: "100%", minWidth: "850px", borderCollapse: "collapse" },
    th: {
      textAlign: "left",
      background: "#f8fafc",
      color: "#475569",
      fontSize: "12px",
      padding: "12px",
      borderBottom: "1px solid #e2e8f0",
    },
    td: {
      padding: "12px",
      fontSize: "13px",
      borderBottom: "1px solid #e2e8f0",
      color: "#334155",
    },
    button: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "11px 16px",
      border: 0,
      borderRadius: "7px",
      background: "#1d4ed8",
      color: "#fff",
      fontWeight: 600,
      cursor: "pointer",
    },
  };

  const StatCard = ({ title, value, icon: Icon }) => (
    <div style={styles.stat}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={styles.statLabel}>{title}</span>
        <span
          style={{
            background: "#eff6ff",
            color: "#1d4ed8",
            padding: "9px",
            borderRadius: "9px",
          }}
        >
          <Icon size={19} />
        </span>
      </div>
      <div style={styles.statValue}>{money(value)}</div>
    </div>
  );

  const exportCsv = () => {
    const headers = [
      "Report Date",
      "Type",
      "Category",
      "Source",
      "Office",
      "Project/Office Name",
      "Code",
      "Budget Head",
      "Amount",
      "Remarks",
    ];

    const lines = entryRows.map((entry) => [
      entry.reportDate,
      entry.parent.type,
      entry.parent.categoryName,
      entry.parent.sourceName,
      entry.parent.officeName,
      entry.parent.name,
      entry.parent.code || "",
      entry.headName,
      entry.amount,
      entry.remarks || "",
    ]);

    const csv = [headers, ...lines]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SHED-Expenditure-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={styles.page}>Loading central reports...</div>;
  }

  if (error && reportRows.length === 0) {
    return (
      <div style={styles.page}>
        <h1 style={styles.heading}>Central Reports</h1>
        <div style={{ ...styles.card, color: "#b91c1c" }}>{error}</div>
        <button style={styles.button} onClick={loadReportData}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={styles.heading}>Central Reports</h1>
          <p style={styles.subtitle}>
            SHED-wide project and office expenditure report.
            {activeFiscalYear && (
              <strong style={{ marginLeft: "8px", color: "#1d4ed8" }}>
                Active Fiscal Year: {activeFiscalYear.name}
              </strong>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
          <button style={styles.button} onClick={loadReportData}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button style={styles.button} onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={{ fontSize: "17px", marginTop: 0 }}>
          Report Filters
        </h2>

        <div style={styles.grid}>
          <div>
            <label style={styles.label}>From Date</label>
            <input
              type="date"
              style={styles.input}
              value={fromDate}
              min={activeFiscalYear?.startDate || undefined}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label style={styles.label}>To Date</label>
            <input
              type="date"
              style={styles.input}
              value={toDate}
              min={fromDate}
              max={activeFiscalYear?.endDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div>
            <label style={styles.label}>Budget Category</label>
            <select
              style={styles.input}
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="OPERATIONAL">Operational</option>
              <option value="DEVELOPMENT">Development</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Search Office / Project</label>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "12px",
                  color: "#94a3b8",
                }}
              />
              <input
                style={{ ...styles.input, paddingLeft: "34px" }}
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {fromDate > toDate && (
          <p style={{ color: "#b91c1c", marginBottom: 0 }}>
            From Date cannot be later than To Date.
          </p>
        )}
      </div>

      <div style={styles.grid}>
        <StatCard
          title="Total Expenditure"
          value={totals.total}
          icon={Wallet}
        />
        <StatCard
          title="Development ADP — Projects"
          value={totals.project}
          icon={FolderKanban}
        />
        <StatCard
          title="Development BLOCK"
          value={totals.block}
          icon={TrendingUp}
        />
        <StatCard
          title="Operational"
          value={totals.operational}
          icon={Building2}
        />
      </div>

      <div style={{ ...styles.card, marginTop: "20px" }}>
        <h2 style={{ fontSize: "18px", marginTop: 0 }}>
          Expenditure Summary
        </h2>

        <div style={styles.grid}>
          <div>
            <div style={styles.statLabel}>Development Total</div>
            <div style={styles.statValue}>
              {money(totals.development)}
            </div>
          </div>
          <div>
            <div style={styles.statLabel}>Operational Total</div>
            <div style={styles.statValue}>
              {money(totals.operational)}
            </div>
          </div>
          <div>
            <div style={styles.statLabel}>Report Period</div>
            <div style={{ ...styles.statValue, fontSize: "15px" }}>
              {fromDate} to {toDate}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={{ fontSize: "18px", marginTop: 0 }}>
          Office-wise Expenditure Summary
        </h2>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Office</th>
                <th style={styles.th}>Operational</th>
                <th style={styles.th}>Development ADP</th>
                <th style={styles.th}>Development BLOCK</th>
                <th style={styles.th}>Total Expenditure</th>
              </tr>
            </thead>
            <tbody>
              {officeSummary.length === 0 ? (
                <tr>
                  <td colSpan="5" style={styles.td}>
                    No expenditure found for this period.
                  </td>
                </tr>
              ) : (
                officeSummary.map((item) => (
                  <tr key={item.officeId}>
                    <td style={styles.td}>
                      <strong>{item.officeName}</strong>
                    </td>
                    <td style={styles.td}>{money(item.operational)}</td>
                    <td style={styles.td}>{money(item.developmentADP)}</td>
                    <td style={styles.td}>{money(item.developmentBlock)}</td>
                    <td style={styles.td}>
                      <strong>{money(item.total)}</strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={{ fontSize: "18px", marginTop: 0 }}>
          Detailed Expenditure Report
        </h2>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Office</th>
                <th style={styles.th}>Project / Allocation</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Period Expenditure</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="6" style={styles.td}>
                    No records found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      {item.type === "PROJECT" ? "Project" : "Office"}
                    </td>
                    <td style={styles.td}>{item.officeName}</td>
                    <td style={styles.td}>
                      <strong>{item.name}</strong>
                      {item.code && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            marginTop: "4px",
                          }}
                        >
                          {item.code}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>{item.categoryName}</td>
                    <td style={styles.td}>{item.sourceName}</td>
                    <td style={styles.td}>
                      <strong>{money(item.expenditure)}</strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan="5"
                  style={{ ...styles.td, textAlign: "right" }}
                >
                  <strong>Filtered Total</strong>
                </td>
                <td style={styles.td}>
                  <strong>
                    {money(
                      filteredRows.reduce(
                        (sum, item) => sum + item.expenditure,
                        0
                      )
                    )}
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={{ fontSize: "18px", marginTop: 0 }}>Expenditure Entry Details</h2>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          Individual spending entries for the selected date range, including budget head and remarks.
        </p>
        <div style={styles.tableWrap}>
          <table style={{ ...styles.table, minWidth: "1200px" }}>
            <thead><tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Office</th>
              <th style={styles.th}>Project / Allocation</th>
              <th style={styles.th}>Budget Head</th>
              <th style={styles.th}>Category / Source</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Remarks</th>
            </tr></thead>
            <tbody>
              {entryRows.length === 0 ? <tr><td colSpan="8" style={styles.td}>No expenditure entries found for this period and filter.</td></tr> : entryRows.map((entry) => (
                <tr key={`${entry.parent.id}-${entry.id}`}>
                  <td style={styles.td}>{entry.reportDate}</td>
                  <td style={styles.td}>{entry.parent.type === "PROJECT" ? "Project" : "Office"}</td>
                  <td style={styles.td}>{entry.parent.officeName}</td>
                  <td style={styles.td}>{entry.parent.name}{entry.parent.code ? ` (${entry.parent.code})` : ""}</td>
                  <td style={styles.td}>{entry.headName}</td>
                  <td style={styles.td}>{entry.parent.categoryName} / {entry.parent.sourceName}</td>
                  <td style={styles.td}><strong>{money(entry.amount)}</strong></td>
                  <td style={styles.td}>{entry.remarks || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td colSpan="6" style={{ ...styles.td, textAlign: "right" }}><strong>Entry Total</strong></td>
              <td style={styles.td}><strong>{money(entryRows.reduce((sum, entry) => sum + entry.amount, 0))}</strong></td>
              <td style={styles.td}></td>
            </tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
