import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ReceiptText, Wallet, TrendingDown, CircleDollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const money = (value) => new Intl.NumberFormat("en-BD", {
  style: "currency", currency: "BDT", maximumFractionDigits: 2,
}).format(Number(value || 0));

export default function MyProjectDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/auth/my-project-dashboard");
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || err.response?.data?.title || "Could not load your assigned project dashboard.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading-state">Loading your project dashboard…</div>;
  if (error) return <div className="page-container"><div className="error-message">{error}</div><button className="secondary-button" onClick={load}><RefreshCw size={16} /> Retry</button></div>;
  if (!summary?.project) return <div className="empty-state">No project is assigned to this account.</div>;

  const { project, totalSpent, remaining, budgetHeads = [], recentEntries = [] } = summary;
  const allocated = Number(project.allocatedAmount || 0);
  const spentPercent = allocated > 0 ? Math.min(Number(totalSpent || 0) / allocated * 100, 100) : 0;
  const headLabels = new Map(budgetHeads.map((head) => [String(head.expenseHeadId), `${head.code ? `${head.code} — ` : ""}${head.name}`]));

  return <div className="page-container">
    <div className="page-header">
      <div><h1>My Project Dashboard</h1><p>{project.projectCode} · {project.projectNameBn || project.projectName}</p></div>
      <div className="office-header-actions">
        <button className="secondary-button" onClick={load}><RefreshCw size={16} /> Refresh</button>
        <Link className="primary-button" to="/expenditures"><ReceiptText size={16} /> Enter expenditure</Link>
      </div>
    </div>

    <div className="stat-grid">
      <div className="stat-card"><div className="stat-info"><p>Project allocation</p><h2>{money(allocated)}</h2><span>{project.projectCode}</span></div><div className="stat-icon blue"><Wallet size={21} /></div></div>
      <div className="stat-card"><div className="stat-info"><p>Total spent</p><h2>{money(totalSpent)}</h2><span>{spentPercent.toFixed(1)}% of project allocation</span></div><div className="stat-icon orange"><TrendingDown size={21} /></div></div>
      <div className="stat-card"><div className="stat-info"><p>Remaining budget</p><h2>{money(remaining)}</h2><span>Available project balance</span></div><div className="stat-icon green"><CircleDollarSign size={21} /></div></div>
    </div>

    <div className="content-card allocation-progress">
      <div className="progress-heading"><strong>Project budget used</strong><span>{spentPercent.toFixed(1)}%</span></div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${spentPercent}%` }} /></div>
    </div>

    <div className="content-card">
      <div className="card-heading"><h2>Expenditure by budget head</h2><p>Latest cumulative expenditure recorded under each head.</p></div>
      {budgetHeads.length === 0 ? <div className="empty-state">No expenditure has been entered for this project yet.</div> :
        <div className="table-wrapper"><table><thead><tr><th>Budget head</th><th>Latest cumulative expenditure</th><th>Last reported</th></tr></thead><tbody>
          {budgetHeads.map((head) => <tr key={head.expenseHeadId ?? "legacy"}><td>{head.code ? `${head.code} — ` : ""}{head.name}</td><td>{money(head.spent)}</td><td>{head.lastReported || "—"}</td></tr>)}
        </tbody></table></div>}
    </div>

    <div className="content-card" style={{ marginTop: 20 }}>
      <div className="card-heading"><h2>Recent expenditure entries</h2><p>Latest reports for your assigned project.</p></div>
      {recentEntries.length === 0 ? <div className="empty-state">No expenditure entries yet.</div> :
        <div className="table-wrapper"><table><thead><tr><th>Report date</th><th>Budget head</th><th>Amount added</th><th>Cumulative amount</th><th>Remarks</th></tr></thead><tbody>
          {recentEntries.map((row) => <tr key={row.id}><td>{row.reportDate}</td><td>{headLabels.get(String(row.expenseHeadId)) || (row.expenseHeadId == null ? "Legacy entries" : "Budget head")}</td><td>{money(row.incrementalAmount)}</td><td>{money(row.cumulativeAmount)}</td><td>{row.remarks || "—"}</td></tr>)}
        </tbody></table></div>}
    </div>
  </div>;
}
