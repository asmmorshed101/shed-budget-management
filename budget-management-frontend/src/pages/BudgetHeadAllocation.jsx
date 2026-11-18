import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../auth/AuthContext";
import { loadActiveMinistryContext } from "../services/budgetContext";

const array = (data) => Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : Array.isArray(data?.data) ? data.data : [];
const money = (value) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 2 }).format(Number(value || 0));
const errorText = (error) => {
  const message = error.response?.data?.message || error.response?.data?.detail || error.message || "Could not load budget head allocations.";
  return error.config?.url ? `${message} (${error.config.url})` : message;
};

export default function BudgetHeadAllocation() {
  const { user } = useAuth();
  const [targets, setTargets] = useState([]);
  const [heads, setHeads] = useState([]);
  const [targetKey, setTargetKey] = useState("");
  const [amounts, setAmounts] = useState({});
  const [selectedHeadIds, setSelectedHeadIds] = useState([]);
  const [editingHeadIds, setEditingHeadIds] = useState([]);
  const [pendingHeadId, setPendingHeadId] = useState("");
  const [headSearch, setHeadSearch] = useState("");
  const [showHeadOptions, setShowHeadOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const target = targets.find((item) => item.key === targetKey);
  const selectedHeads = heads.filter((head) => selectedHeadIds.includes(String(head.id)));
  const primaryHead = selectedHeads.find((head) => String(head.id) === pendingHeadId);
  const otherSelectedHeads = selectedHeads.filter((head) => String(head.id) !== String(primaryHead?.id));
  const total = selectedHeads.reduce((sum, head) => sum + Number(amounts[head.id] || 0), 0);
  const remaining = Number(target?.allocatedAmount || 0) - total;
  const endpoint = target ? `/${target.type === "PROJECT" ? "projects" : "office-allocations"}/${target.id}/head-budgets` : "";
  const availableHeads = heads.filter((head) => {
    if (selectedHeadIds.includes(String(head.id))) return false;
    const query = headSearch.trim().toLocaleLowerCase();
    return !query || [head.code, head.name, head.nameBn].some((value) => String(value || "").toLocaleLowerCase().includes(query));
  }).slice(0, 12);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const headsRes = await api.get("/expense-heads/active");
        const activeHeads = array(headsRes.data).filter((head) => head.active === true || head.isActive === true);

        if (user?.role === "ADMIN") {
          const assignedTargets = [];
          if (user.assignedProjectId) {
            const { data: project } = await api.get(`/projects/${user.assignedProjectId}`);
            assignedTargets.push({ id: project.id, key: `PROJECT-${project.id}`, type: "PROJECT", allocatedAmount: project.allocatedAmount, label: `${project.projectCode} — ${project.projectNameBn || project.projectName}` });
          }
          if (user.assignedOfficeAllocationId) {
            const { data: allocation } = await api.get(`/office-allocations/${user.assignedOfficeAllocationId}`);
            assignedTargets.push({ id: allocation.id, key: `OFFICE-${allocation.id}`, type: "OFFICE", allocatedAmount: allocation.allocatedAmount, label: `Assigned Office Allocation #${allocation.id}` });
          }
          setHeads(activeHeads);
          setTargets(assignedTargets);
          if (assignedTargets.length) setTargetKey(assignedTargets[0].key);
          return;
        }

        const { activeFiscalYear, ministry } = await loadActiveMinistryContext();
        const [budgetRes, organizationsRes] = await Promise.all([
          api.get("/ministry-budgets/by-fiscal-year", { params: { fiscalYearId: activeFiscalYear.id, organizationId: ministry.id } }),
          api.get("/organizations/hierarchy"),
        ]);
        const budgetData = budgetRes.data;
        const budget = Array.isArray(budgetData) ? budgetData[0] : budgetData;
        if (!budget?.id) throw new Error("No ministry budget is available for the active fiscal year.");
        const offices = new Map();
        const flatten = (items) => items.forEach((item) => { offices.set(String(item.id), item.nameBn || item.name || `Office ${item.id}`); flatten(item.children || []); });
        flatten(array(organizationsRes.data));
        const categories = array((await api.get(`/ministry-budgets/${budget.id}/categories`)).data);
        const officeTargets = [];
        const projectOfficeTargets = [];
        for (const category of categories) {
          const sources = array((await api.get(`/budget-categories/${category.id}/sources`)).data);
          for (const source of sources) {
            const allocations = array((await api.get(`/budget-sources/${source.id}/offices`)).data);
            for (const allocation of allocations) {
              const officeName = offices.get(String(allocation.organizationId)) || `Office ${allocation.organizationId}`;
              if ((category.categoryCode === "OPERATIONAL" || (category.categoryCode === "DEVELOPMENT" && source.sourceCode === "BLOCK")) && Number(allocation.allocatedAmount) > 0) {
                officeTargets.push({ id: allocation.id, key: `OFFICE-${allocation.id}`, type: "OFFICE", allocatedAmount: allocation.allocatedAmount, label: `${officeName} — ${category.categoryName} / ${source.sourceName}` });
              }
              if (category.categoryCode === "DEVELOPMENT" && source.sourceCode === "ADP" && Number(allocation.allocatedAmount) > 0) {
                projectOfficeTargets.push({ id: allocation.id, officeName, allocatedAmount: allocation.allocatedAmount });
              }
            }
          }
        }
        const projectTargets = [];
        for (const allocation of projectOfficeTargets) {
          const projects = array((await api.get(`/office-allocations/${allocation.id}/projects`)).data);
          projects.forEach((project) => projectTargets.push({ id: project.id, key: `PROJECT-${project.id}`, type: "PROJECT", allocatedAmount: project.allocatedAmount, label: `${project.projectCode} — ${project.projectNameBn || project.projectName} (${allocation.officeName})` }));
        }
        const visibleTargets = [...officeTargets, ...projectTargets];
        setTargets(visibleTargets);
        setHeads(activeHeads);
        if (visibleTargets.length) setTargetKey(visibleTargets[0].key);
      } catch (err) { setError(errorText(err)); }
      finally { setLoading(false); }
    })();
  }, [user]);

  useEffect(() => {
    if (!target || !endpoint) return;
    (async () => {
      try {
        setError(""); setSuccess("");
        const { data } = await api.get(endpoint);
        const values = {};
        array(data).forEach((item) => { values[item.expenseHeadId] = String(item.allocatedAmount); });
        setAmounts(values);
        setSelectedHeadIds(Object.keys(values).map(String));
        setEditingHeadIds([]);
        setPendingHeadId("");
        setDirty(false);
      } catch (err) { setError(errorText(err)); setAmounts({}); setSelectedHeadIds([]); setEditingHeadIds([]); setPendingHeadId(""); setDirty(false); }
    })();
  }, [targetKey]);

  const save = async (event) => {
    event.preventDefault(); setError(""); setSuccess("");
    if (total > Number(target.allocatedAmount)) { setError("The total assigned to budget heads cannot exceed the allocated budget."); return; }
    try {
      setSaving(true);
      const allocations = selectedHeads.map((head) => ({ expenseHeadId: Number(head.id), allocatedAmount: Number(amounts[head.id] || 0) })).filter((item) => item.allocatedAmount > 0);
      await api.put(endpoint, { allocations });
      setSuccess("Budget head allocations saved.");
      setSelectedHeadIds(allocations.map((item) => String(item.expenseHeadId)));
      setEditingHeadIds([]);
      setPendingHeadId("");
      setAmounts(Object.fromEntries(allocations.map((item) => [item.expenseHeadId, String(item.allocatedAmount)])));
      setDirty(false);
    } catch (err) { setError(errorText(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="page-container">Loading budget allocations…</div>;
  const removeHead = (head) => {
    if (!window.confirm(`Remove ${head.code} from this allocation? Save to apply the change.`)) return;
    setSelectedHeadIds((previous) => previous.filter((id) => id !== String(head.id)));
    setEditingHeadIds((previous) => previous.filter((id) => id !== String(head.id)));
    setAmounts((previous) => { const next = { ...previous }; delete next[head.id]; return next; });
    if (pendingHeadId === String(head.id)) setPendingHeadId("");
    setDirty(true);
  };

  return <div className="page-container">
    <div className="page-header"><div><h1>Budget Head Allocation</h1><p>Optionally divide an office or project budget among budget heads.</p></div></div>
    {error && <div className="error-message">{error}</div>}{success && <div className="success-message">{success}</div>}
    {!targets.length ? <div className="content-card">No eligible office or project allocations are available to divide.</div> : <>
      <div className="content-card">
        <label htmlFor="budget-target" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Office or project</label>
        <select id="budget-target" value={targetKey} onChange={(event) => setTargetKey(event.target.value)} style={{ width: "100%", padding: 11, border: "1px solid #cbd5e1", borderRadius: 7 }}>
          {targets.map((item) => <option key={item.key} value={item.key}>{item.type}: {item.label}</option>)}
        </select>
        <div className="stat-grid" style={{ marginTop: 18 }}>
          <div className="stat-card"><div className="stat-info"><p>Assigned budget</p><h2>{money(target?.allocatedAmount)}</h2></div></div>
          <div className="stat-card"><div className="stat-info"><p>Allocated to heads</p><h2>{money(total)}</h2></div></div>
          <div className="stat-card"><div className="stat-info"><p>Not assigned</p><h2>{money(remaining)}</h2></div></div>
        </div>
      </div>
      <form className="content-card" onSubmit={save}>
        <div className="card-heading"><h2>Divide the budget by head</h2><p>Search by head code or name, select a head, and enter its amount. You can change allocations later.</p></div>
        <div style={{ position: "relative", maxWidth: 620, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <label htmlFor="head-search" style={{ fontWeight: 600 }}>Find a budget head</label>
            {!primaryHead && otherSelectedHeads.length === 0 && dirty && <button className="primary-button" type="submit" disabled={saving || total > Number(target?.allocatedAmount || 0)}>{saving ? "Saving…" : "Save head allocations"}</button>}
          </div>
          <input id="head-search" type="search" value={headSearch} onFocus={() => setShowHeadOptions(true)} onChange={(event) => { setHeadSearch(event.target.value); setShowHeadOptions(true); }} onKeyDown={(event) => { if (event.key === "Escape") setShowHeadOptions(false); }} placeholder="Search by code or name" autoComplete="off" style={{ width: "100%", padding: 11, border: "1px solid #cbd5e1", borderRadius: 7 }} />
          {showHeadOptions && <div style={{ position: "absolute", zIndex: 5, top: "100%", left: 0, right: 0, maxHeight: 300, overflowY: "auto", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 7, boxShadow: "0 8px 20px rgba(15,23,42,.12)" }}>
            {availableHeads.length ? availableHeads.map((head) => <button key={head.id} type="button" onClick={() => { const id = String(head.id); setSelectedHeadIds((previous) => [id, ...previous]); setPendingHeadId(id); setAmounts((previous) => ({ ...previous, [id]: "" })); setHeadSearch(""); setShowHeadOptions(false); setDirty(true); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "#fff", border: 0, borderBottom: "1px solid #e2e8f0", cursor: "pointer" }}>{head.code} — {head.nameBn || head.name}{head.nameBn && head.name ? ` (${head.name})` : ""}</button>) : <div style={{ padding: 12, color: "#64748b" }}>{headSearch ? "No matching budget heads." : "All matching budget heads have been selected."}</div>}
          </div>}
        </div>
        {!primaryHead && <p style={{ color: "#64748b" }}>No budget heads selected yet.</p>}
        {primaryHead && <div style={{ margin: "12px 0 20px", maxWidth: 560, padding: 16, border: "1px solid #dbe2ea", borderRadius: 8, background: "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}><strong>{primaryHead.code} — {primaryHead.nameBn || primaryHead.name}</strong><button className="secondary-button" type="button" onClick={() => removeHead(primaryHead)}>Remove</button></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 7 }}><label htmlFor="primary-head-amount" style={{ fontWeight: 600 }}>Amount assigned to this head</label>{dirty && <button className="primary-button" type="submit" disabled={saving || total > Number(target?.allocatedAmount || 0)}>{saving ? "Saving…" : "Save head allocations"}</button>}</div>
          <input id="primary-head-amount" aria-label={`Amount for ${primaryHead.code}`} type="number" min="0" step="0.01" value={amounts[primaryHead.id] ?? ""} onChange={(event) => { setAmounts((previous) => ({ ...previous, [primaryHead.id]: event.target.value })); setDirty(true); }} placeholder="Enter amount" style={{ width: "100%", padding: 10, border: "1px solid #cbd5e1", borderRadius: 6, boxSizing: "border-box" }} />
        </div>}
        {otherSelectedHeads.length > 0 && <div className="table-wrapper"><table><thead><tr><th>Other selected heads</th><th><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>Amount assigned{!primaryHead && dirty && <button className="primary-button" type="submit" disabled={saving || total > Number(target?.allocatedAmount || 0)}>{saving ? "Saving…" : "Save head allocations"}</button>}</div></th><th></th></tr></thead><tbody>
          {otherSelectedHeads.map((head) => {
            const isEditing = editingHeadIds.includes(String(head.id));
            return <tr key={head.id}>
              <td>{head.code} — {head.nameBn || head.name}</td>
              <td><input aria-label={`Amount for ${head.code}`} type="number" min="0" step="0.01" value={amounts[head.id] ?? ""} readOnly={!isEditing} onChange={(event) => { setAmounts((previous) => ({ ...previous, [head.id]: event.target.value })); setDirty(true); }} placeholder="Enter amount" style={{ width: "100%", maxWidth: 260, padding: 9, border: "1px solid #cbd5e1", borderRadius: 6, background: isEditing ? "#fff" : "#f8fafc", cursor: isEditing ? "text" : "default" }} /></td>
              <td><div style={{ display: "flex", gap: 8 }}><button className="secondary-button" type="button" onClick={() => setEditingHeadIds((previous) => isEditing ? previous.filter((id) => id !== String(head.id)) : [...previous, String(head.id)])}>{isEditing ? "Done" : "Edit"}</button><button className="secondary-button" type="button" onClick={() => removeHead(head)}>Remove</button></div></td>
            </tr>;
          })}
        </tbody></table></div>}
        {total > Number(target?.allocatedAmount || 0) && <p className="error-message">Head allocations exceed this assigned budget.</p>}
        <div style={{ marginTop: 18, display: "flex", gap: 10 }}><button className="secondary-button" type="button" onClick={() => { if (window.confirm("Clear all head selections from this form? Save to apply changes.")) { setAmounts({}); setSelectedHeadIds([]); setEditingHeadIds([]); setPendingHeadId(""); setDirty(true); } }}>Clear all</button></div>
      </form>
    </>}
  </div>;
}
