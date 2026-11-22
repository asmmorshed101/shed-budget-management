
import { useEffect, useMemo, useState } from "react";
import { Edit2, X } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../auth/AuthContext";
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
  error.response?.data?.detail ||
  error.response?.data?.error ||
  error.response?.data?.title ||
  error.message ||
  "Something went wrong.";

export default function ExpenditureEntry() {
  const { user } = useAuth();
  const isAssignedProjectAdmin = user?.role === "ADMIN" && Boolean(user.assignedProjectId);
  const isAssignedOfficeAdmin = user?.role === "ADMIN" && Boolean(user.assignedOfficeAllocationId);
  const [activeTab, setActiveTab] = useState(
    user?.role === "ADMIN" && !user.assignedProjectId && user.assignedOfficeAllocationId ? "OFFICE" : "PROJECT"
  );
  const [activeFiscalYear, setActiveFiscalYear] = useState(null);

  const [projectAllocations, setProjectAllocations] = useState([]);
  const [officeAllocations, setOfficeAllocations] = useState([]);
  const [sedpCategory, setSedpCategory] = useState(null);

  const [selectedProjectAllocation, setSelectedProjectAllocation] =
    useState("");
  const [selectedOfficeAllocation, setSelectedOfficeAllocation] =
    useState("");

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");

  const [history, setHistory] = useState([]);
  const [editingRecordId, setEditingRecordId] = useState(null);

  const [expenseHeads, setExpenseHeads] = useState([]);
  const [selectedHead, setSelectedHead] = useState("");

  const [reportDate, setReportDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dailyAmount, setDailyAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load budget, categories, sources and office allocations
  useEffect(() => {
    const loadAllocations = async () => {
      try {
        setLoading(true);
        setError("");

        if (user?.role === "ADMIN") {
          if (user.assignedProjectId) {
            const { data: dashboard } = await api.get("/auth/my-project-dashboard");
            const assignedProject = dashboard.project;
            setProjects([assignedProject]);
            setSelectedProject(String(assignedProject.id));
          }
          if (user.assignedOfficeAllocationId) {
            const { data: assignedOffice } = await api.get(`/office-allocations/${user.assignedOfficeAllocationId}`);
            setOfficeAllocations([{ ...assignedOffice, officeName: `Assigned office allocation #${assignedOffice.id}` }]);
            setSelectedOfficeAllocation(String(assignedOffice.id));
          }
          if (!user.assignedProjectId && !user.assignedOfficeAllocationId) {
            throw new Error("No project or office assignment is configured for this admin account.");
          }
          return;
        }

        // Always use the currently active fiscal year from the database.
        // Do not rely on a hardcoded VITE_FISCAL_YEAR_ID value.
        const { activeFiscalYear: currentActiveYear, ministry } =
          await loadActiveMinistryContext();

        setActiveFiscalYear(currentActiveYear);

        const [budgetResponse, organizationResponse] = await Promise.all([
          api.get("/ministry-budgets/by-fiscal-year", {
            params: {
              fiscalYearId: currentActiveYear.id,
              organizationId: ministry.id,
            },
          }),
          api.get("/organizations/hierarchy"),
        ]);

        const budgetData = budgetResponse.data;
        const budget = Array.isArray(budgetData)
          ? budgetData[0]
          : budgetData;

        if (!budget?.id) {
          throw new Error("No ministry budget found for this fiscal year.");
        }

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

        const categoryResponse = await api.get(
          `/ministry-budgets/${budget.id}/categories`
        );
        const categories = getArray(categoryResponse.data);
        setSedpCategory(categories.find((item) => item.categoryCode === "SEDP") || null);

        const projectCategory = categories.find(
          (item) => item.categoryCode === "DEVELOPMENT"
        );

        const projectSources = projectCategory
          ? getArray(
              (
                await api.get(
                  `/budget-categories/${projectCategory.id}/sources`
                )
              ).data
            )
          : [];

        const adpSource = projectSources.find(
          (item) => item.sourceCode === "ADP"
        );

        if (adpSource) {
          const response = await api.get(
            `/budget-sources/${adpSource.id}/offices`
          );
          const allocations = getArray(response.data);

          setProjectAllocations(
            allocations.map((allocation) => ({
              ...allocation,
              officeName:
                organizationMap.get(String(allocation.organizationId))
                  ?.nameBn ||
                organizationMap.get(String(allocation.organizationId))
                  ?.name ||
                `Office ${allocation.organizationId}`,
            }))
          );
        }

        // Office expenditure: Operational and Development BLOCK allocations
        const officeResults = [];

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
            // Development ADP is handled through project expenditure.
            if (
              category.categoryCode === "DEVELOPMENT" &&
              source.sourceCode === "ADP"
            ) {
              continue;
            }

            const officeResponse = await api.get(
              `/budget-sources/${source.id}/offices`
            );

            getArray(officeResponse.data).forEach((allocation) => {
              const office =
                organizationMap.get(String(allocation.organizationId));

              officeResults.push({
                ...allocation,
                categoryName: category.categoryName,
                sourceName: source.sourceName,
                officeName:
                  office?.nameBn ||
                  office?.name ||
                  `Office ${allocation.organizationId}`,
              });
            });
          }
        }

        setOfficeAllocations(officeResults);

        if (adpSource) {
          const response = await api.get(
            `/budget-sources/${adpSource.id}/offices`
          );
          const allocations = getArray(response.data);
          if (allocations.length > 0) {
            setSelectedProjectAllocation(String(allocations[0].id));
          }
        }

        if (officeResults.length > 0) {
          setSelectedOfficeAllocation(String(officeResults[0].id));
        }
      } catch (err) {
        setError(getError(err));
      } finally {
        setLoading(false);
      }
    };

    loadAllocations();
  }, [user]);

  // Load expense (budget) heads
  useEffect(() => {
    const loadHeads = async () => {
      try {
        const response = await api.get("/expense-heads");
        setExpenseHeads(getArray(response.data));
      } catch (err) {
        setError(getError(err));
      }
    };

    loadHeads();
  }, []);

  // Only active heads can be chosen for a new entry
  const activeHeads = useMemo(
    () => expenseHeads.filter((head) => head.active === true || head.isActive === true),
    [expenseHeads]
  );

  const editingRecord = history.find((item) => item.id === editingRecordId);
  const formHeads = editingRecord && !activeHeads.some((head) => String(head.id) === String(editingRecord.expenseHeadId))
    ? [...activeHeads, ...expenseHeads.filter((head) => String(head.id) === String(editingRecord.expenseHeadId))]
    : activeHeads;

  // History may contain heads that were deactivated later, so look up in all heads
  const headLabel = (head) => `${head.code} - ${head.nameBn || head.name}`;

  const headNameById = useMemo(() => {
    const map = new Map();
    expenseHeads.forEach((head) => map.set(String(head.id), headLabel(head)));
    return map;
  }, [expenseHeads]);

  const selectedProjectAllocationData = useMemo(
    () =>
      projectAllocations.find(
        (item) => String(item.id) === selectedProjectAllocation
      ),
    [projectAllocations, selectedProjectAllocation]
  );

  const selectedOfficeAllocationData = useMemo(
    () =>
      officeAllocations.find(
        (item) => String(item.id) === selectedOfficeAllocation
      ),
    [officeAllocations, selectedOfficeAllocation]
  );

  // Load projects when a Development ADP allocation is selected
  useEffect(() => {
    const loadProjects = async () => {
      if (!selectedProjectAllocation) {
        if (isAssignedProjectAdmin) return;
        setProjects([]);
        setSelectedProject("");
        return;
      }

      try {
        const response = await api.get(
          `/office-allocations/${selectedProjectAllocation}/projects`
        );

        const items = getArray(response.data);
        setProjects(items);
        setSelectedProject(items.length ? String(items[0].id) : "");
      } catch (err) {
        setProjects([]);
        setSelectedProject("");
        setError(getError(err));
      }
    };

    loadProjects();
  }, [selectedProjectAllocation, isAssignedProjectAdmin]);

  const selectedProjectData = useMemo(
    () => projects.find((item) => String(item.id) === selectedProject),
    [projects, selectedProject]
  );

  // Load expenditure history
  useEffect(() => {
    const loadHistory = async () => {
      const id = activeTab === "PROJECT"
        ? selectedProject
        : activeTab === "OFFICE"
          ? selectedOfficeAllocation
          : sedpCategory?.id;

      if (!id) {
        setHistory([]);
        return;
      }

      try {
        setHistoryLoading(true);
        setError("");

        const endpoint = activeTab === "PROJECT"
          ? `/projects/${id}/expenditures`
          : activeTab === "OFFICE"
            ? `/office-allocations/${id}/expenditures`
            : `/budget-categories/${id}/expenditures`;

        const response = await api.get(endpoint);
        setHistory(getArray(response.data));
      } catch (err) {
        setHistory([]);
        setError(getError(err));
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [activeTab, selectedProject, selectedOfficeAllocation, sedpCategory]);

  const currentHistory = history;

  // Keep only the latest cumulative record for each Budget Head.
  // Older records with null expenseHeadId are grouped as LEGACY.
  const latestByHead = useMemo(() => {
    const latestMap = new Map();
    const sortedHistory = [...currentHistory].sort((a, b) => {
      const dateDifference =
        new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
      if (dateDifference !== 0) return dateDifference;
      return Number(b.id || 0) - Number(a.id || 0);
    });

    sortedHistory.forEach((record) => {
      const key = record.expenseHeadId == null
        ? "LEGACY"
        : String(record.expenseHeadId);
      if (!latestMap.has(key)) latestMap.set(key, record);
    });

    return latestMap;
  }, [currentHistory]);

  const allocatedAmount = Number(
    activeTab === "PROJECT"
      ? selectedProjectData?.allocatedAmount || 0
      : activeTab === "OFFICE"
        ? selectedOfficeAllocationData?.allocatedAmount || 0
        : sedpCategory?.totalAmount || 0
  );

  // Total expenditure = latest cumulative amount of every head,
  // including the legacy (null expenseHeadId) bucket.
  const totalCurrentExpenditure = Array.from(latestByHead.values()).reduce(
    (total, record) => total + Number(record.cumulativeAmount || 0),
    0
  );

  const remainingBudget = Math.max(
    allocatedAmount - totalCurrentExpenditure,
    0
  );
  const availableForEntry = remainingBudget + Number(editingRecord?.incrementalAmount || 0);

  const enteredDailyAmount = Number(dailyAmount || 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const targetId = activeTab === "PROJECT"
      ? selectedProject
      : activeTab === "OFFICE"
        ? selectedOfficeAllocation
        : sedpCategory?.id;

    if (!targetId) {
      setError(
        activeTab === "PROJECT"
          ? "Please select a project."
          : activeTab === "OFFICE"
            ? "Please select an office allocation."
            : "No SEDP allocation is available for this fiscal year."
      );
      return;
    }

    if (!selectedHead) {
      setError("Please select a budget head.");
      return;
    }

    if (!reportDate || dailyAmount === "") {
      setError("Please enter report date and expenditure amount for this date.");
      return;
    }

    if (enteredDailyAmount <= 0) {
      setError("Expenditure amount for this date must be greater than zero.");
      return;
    }

    if (enteredDailyAmount > availableForEntry) {
      setError(
        `Expenditure amount cannot exceed the available overall budget (${money(availableForEntry)}).`
      );
      return;
    }

    try {
      setSaving(true);

      const endpoint = activeTab === "PROJECT"
        ? `/projects/${targetId}/expenditures`
        : activeTab === "OFFICE"
          ? `/office-allocations/${targetId}/expenditures`
          : `/budget-categories/${targetId}/expenditures`;

      const payload = {
        reportDate,
        amount: enteredDailyAmount,
        remarks,
        expenseHeadId: Number(selectedHead),
      };
      if (editingRecordId) {
        await api.put(`${endpoint}/${editingRecordId}`, payload);
      } else {
        await api.post(endpoint, payload);
      }

      setSuccess(editingRecordId ? "Expenditure updated successfully." : "Expenditure report submitted successfully.");
      setDailyAmount("");
      setRemarks("");
      setSelectedHead("");
      setEditingRecordId(null);

      const response = await api.get(endpoint);
      setHistory(getArray(response.data));
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setError("");
    setSuccess("");
    setDailyAmount("");
    setRemarks("");
    setSelectedHead("");
    setEditingRecordId(null);
  };

  const startEditing = (item) => {
    setEditingRecordId(item.id);
    setReportDate(item.reportDate);
    setDailyAmount(String(item.incrementalAmount || ""));
    setRemarks(item.remarks || "");
    setSelectedHead(item.expenseHeadId == null ? "" : String(item.expenseHeadId));
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditing = () => {
    setEditingRecordId(null);
    setDailyAmount("");
    setRemarks("");
    setSelectedHead("");
    setReportDate(new Date().toISOString().slice(0, 10));
    setError("");
  };

  const styles = {
    page: { padding: "24px", maxWidth: "1200px", margin: "0 auto" },
    heading: { fontSize: "25px", fontWeight: 700, marginBottom: "6px" },
    subtitle: { color: "#64748b", marginBottom: "24px" },
    tabs: { display: "flex", gap: "10px", marginBottom: "22px" },
    tab: (active) => ({
      padding: "11px 20px",
      borderRadius: "8px",
      border: "1px solid #dbe2ea",
      background: active ? "#1d4ed8" : "#fff",
      color: active ? "#fff" : "#334155",
      cursor: "pointer",
      fontWeight: 600,
    }),
    card: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "22px",
      marginBottom: "20px",
    },
    label: {
      display: "block",
      fontWeight: 600,
      fontSize: "14px",
      marginBottom: "7px",
      color: "#334155",
    },
    input: {
      width: "100%",
      padding: "11px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: "7px",
      fontSize: "14px",
      boxSizing: "border-box",
      background: "#fff",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "18px",
    },
    stat: {
      background: "#f8fafc",
      padding: "16px",
      borderRadius: "9px",
      border: "1px solid #e2e8f0",
    },
    statLabel: { fontSize: "13px", color: "#64748b", marginBottom: "7px" },
    statValue: { fontSize: "19px", fontWeight: 700, color: "#0f172a" },
    button: {
      background: "#1d4ed8",
      color: "#fff",
      padding: "12px 22px",
      border: 0,
      borderRadius: "7px",
      fontWeight: 600,
      cursor: "pointer",
    },
    tableWrap: { overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", minWidth: "650px" },
    th: {
      textAlign: "left",
      padding: "12px",
      background: "#f8fafc",
      color: "#475569",
      fontSize: "13px",
      borderBottom: "1px solid #e2e8f0",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #e2e8f0",
      fontSize: "14px",
    },
  };

  if (loading) {
    return <div style={styles.page}>Loading expenditure information...</div>;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Expenditure Entry</h1>
      <p style={styles.subtitle}>
        Record one or more expenditures by date and budget head.
        {isAssignedProjectAdmin && selectedProjectData && (
          <strong style={{ marginLeft: "8px", color: "#1d4ed8" }}>
            Assigned Project: {selectedProjectData.projectNameBn || selectedProjectData.projectName}
          </strong>
        )}
        {activeFiscalYear && (
          <strong style={{ marginLeft: "8px", color: "#1d4ed8" }}>
            Active Fiscal Year: {activeFiscalYear.name}
          </strong>
        )}
      </p>

      <div style={styles.tabs}>
        {(!user || user.role !== "ADMIN" || isAssignedProjectAdmin) && <button
          type="button"
          style={styles.tab(activeTab === "PROJECT")}
          onClick={() => changeTab("PROJECT")}
        >
          Project Expenditure
        </button>}

        {(!user || user.role !== "ADMIN" || isAssignedOfficeAdmin) && <button
          type="button"
          style={styles.tab(activeTab === "OFFICE")}
          onClick={() => changeTab("OFFICE")}
        >
          Office Expenditure
        </button>}
        {user?.role === "SUPER_ADMIN" && sedpCategory && <button
          type="button"
          style={styles.tab(activeTab === "SEDP")}
          onClick={() => changeTab("SEDP")}
        >
          SEDP Expenditure
        </button>}
      </div>

      {error && (
        <div
          style={{
            ...styles.card,
            color: "#b91c1c",
            background: "#fef2f2",
            borderColor: "#fecaca",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            ...styles.card,
            color: "#166534",
            background: "#f0fdf4",
            borderColor: "#bbf7d0",
          }}
        >
          {success}
        </div>
      )}

      <div style={styles.card}>
        <h2 style={{ fontSize: "18px", marginTop: 0, marginBottom: "20px" }}>
          {activeTab === "PROJECT"
            ? "Project Expenditure Information"
            : activeTab === "OFFICE"
              ? "Office Expenditure Information"
              : "SEDP Expenditure Information"}
        </h2>

        <div style={styles.grid}>
          {activeTab === "PROJECT" ? (
            <>
              {!isAssignedProjectAdmin && <div>
                <label style={styles.label}>Development ADP Office</label>
                <select
                  style={styles.input}
                  value={selectedProjectAllocation}
                  onChange={(e) =>
                    { cancelEditing(); setSelectedProjectAllocation(e.target.value); }
                  }
                >
                  <option value="">Select office allocation</option>
                  {projectAllocations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.officeName}
                    </option>
                  ))}
                </select>
              </div>}

              <div>
                <label style={styles.label}>{isAssignedProjectAdmin ? "Assigned project" : "Project"}</label>
                {isAssignedProjectAdmin ? (
                  <div style={{ ...styles.input, background: "#f8fafc" }}>
                    {selectedProjectData?.projectCode} — {selectedProjectData?.projectNameBn || selectedProjectData?.projectName}
                  </div>
                ) : (
                  <select
                    style={styles.input}
                    value={selectedProject}
                    onChange={(e) => { cancelEditing(); setSelectedProject(e.target.value); }}
                    disabled={!projects.length}
                  >
                    <option value="">Select project</option>
                    {projects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.projectCode} - {item.projectName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          ) : activeTab === "OFFICE" ? (
            <div>
              <label style={styles.label}>Office Allocation</label>
              <select
                style={styles.input}
                value={selectedOfficeAllocation}
                onChange={(e) => { cancelEditing(); setSelectedOfficeAllocation(e.target.value); }}
                disabled={isAssignedOfficeAdmin}
              >
                <option value="">Select office allocation</option>
                {officeAllocations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.officeName} — {item.categoryName} / {item.sourceName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label style={styles.label}>SEDP Allocation</label>
              <div style={{ ...styles.input, background: "#f8fafc" }}>
                {sedpCategory?.categoryName} — {activeFiscalYear?.name}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Allocated Budget</div>
          <div style={styles.statValue}>{money(allocatedAmount)}</div>
        </div>

        <div style={styles.stat}>
          <div style={styles.statLabel}>Remaining Budget</div>
          <div style={styles.statValue}>{money(remainingBudget)}</div>
        </div>
      </div>

      <div style={{ ...styles.card, marginTop: "20px" }}>
        <h2 style={{ fontSize: "18px", marginTop: 0, marginBottom: "20px" }}>
          {editingRecordId ? "Edit Expenditure Report" : "Submit Expenditure Report"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Budget Head</label>
              <select
                style={styles.input}
                value={selectedHead}
                onChange={(e) => {
                  setSelectedHead(e.target.value);
                  if (!editingRecordId) setDailyAmount("");
                  setError("");
                }}
                required
              >
                <option value="">Select budget head</option>
                {formHeads.map((head) => (
                  <option key={head.id} value={head.id}>
                    {headLabel(head)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Report Date</label>
              <input
                type="date"
                style={styles.input}
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={styles.label}>Expenditure for This Date (৳)</label>
              <input
                type="number"
                min="0.01"
                max={availableForEntry}
                step="0.01"
                style={styles.input}
                value={dailyAmount}
                onChange={(e) => setDailyAmount(e.target.value)}
                placeholder="Enter expenditure for this date"
                required
              />
            </div>

          </div>

          <div style={{ marginTop: "18px" }}>
            <label style={styles.label}>Remarks</label>
            <textarea
              style={{ ...styles.input, minHeight: "85px", resize: "vertical" }}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks (optional)"
            />
          </div>

          <div style={{ marginTop: "20px" }}>
            <button
              type="submit"
              style={{
                ...styles.button,
                opacity: saving ? 0.65 : 1,
              }}
              disabled={
                saving ||
                !(
                  activeTab === "PROJECT"
                    ? selectedProject
                    : activeTab === "OFFICE"
                      ? selectedOfficeAllocation
                      : sedpCategory?.id
                )
              }
            >
              {saving ? (editingRecordId ? "Saving..." : "Submitting...") : (editingRecordId ? "Save Changes" : "Submit Expenditure")}
            </button>
            {editingRecordId && <button type="button" onClick={cancelEditing} style={{ ...styles.button, marginLeft: "10px", background: "#64748b" }} disabled={saving}><X size={16} /> Cancel Edit</button>}
          </div>
        </form>
      </div>

      <div style={styles.card}>
        <h2 style={{ fontSize: "18px", marginTop: 0, marginBottom: "16px" }}>
          Expenditure History
        </h2>

        {historyLoading ? (
          <p>Loading history...</p>
        ) : history.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            No expenditure report found for this selection.
          </p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Report Date</th>
                  <th style={styles.th}>Budget Head</th>
                  <th style={styles.th}>Expenditure Amount</th>
                  <th style={styles.th}>Remarks</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.reportDate}</td>
                    <td style={styles.td}>
                      {headNameById.get(String(item.expenseHeadId)) || "—"}
                    </td>
                    <td style={styles.td}>
                      {money(item.incrementalAmount)}
                    </td>
                    <td style={styles.td}>{item.remarks || "—"}</td>
                    <td style={styles.td}>
                      {user?.role !== "USER" && <button type="button" onClick={() => startEditing(item)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", color: "#1d4ed8", fontWeight: 600 }}>
                        <Edit2 size={14} /> Edit
                      </button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
