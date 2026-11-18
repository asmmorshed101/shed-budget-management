import { useEffect, useState } from "react";
import api from "../api/axios";
import { loadActiveMinistryContext } from "../services/budgetContext";

export default function UserManagement() {
  const [users, setUsers] = useState([]); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER"); const [projectId, setProjectId] = useState(""); const [officeId, setOfficeId] = useState("");
  const [assignments, setAssignments] = useState({ projects: [], offices: [] });
  const [activeFiscalYear, setActiveFiscalYear] = useState(null); const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const load = () => api.get("/auth/users").then(({ data }) => setUsers(data)).catch((e) => setError(e.response?.data?.message || "Could not load accounts."));
  useEffect(() => { load(); loadActiveYearAssignments(); }, []);

  const loadActiveYearAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const [{ activeFiscalYear: year, ministry }, organizationResponse] = await Promise.all([
        loadActiveMinistryContext(),
        api.get("/organizations/hierarchy"),
      ]);
      setActiveFiscalYear(year);

      const organizations = [];
      const flatten = (items) => (Array.isArray(items) ? items : []).forEach((org) => {
        organizations.push(org);
        if (Array.isArray(org.children)) flatten(org.children);
      });
      flatten(organizationResponse.data);
      const organizationMap = new Map(organizations.map((org) => [String(org.id), org]));
      const budgetResponse = await api.get("/ministry-budgets/by-fiscal-year", {
        params: { fiscalYearId: year.id, organizationId: ministry.id },
      });
      const budgetData = budgetResponse.data;
      const budget = Array.isArray(budgetData) ? budgetData[0] : budgetData;
      if (!budget?.id) throw new Error(`No ministry budget was found for ${year.name}.`);

      const categoryResponse = await api.get(`/ministry-budgets/${budget.id}/categories`);
      const categories = Array.isArray(categoryResponse.data) ? categoryResponse.data : [];
      const officeOptions = [];
      const projectOptions = [];
      for (const category of categories) {
        if (!["OPERATIONAL", "DEVELOPMENT"].includes(category.categoryCode?.toUpperCase())) continue;
        const sourceResponse = await api.get(`/budget-categories/${category.id}/sources`);
        const sources = Array.isArray(sourceResponse.data) ? sourceResponse.data : [];
        for (const source of sources) {
          const isProjectSource = category.categoryCode?.toUpperCase() === "DEVELOPMENT" && source.sourceCode?.toUpperCase() === "ADP";
          if (category.categoryCode?.toUpperCase() === "DEVELOPMENT" && !["ADP", "BLOCK"].includes(source.sourceCode?.toUpperCase())) continue;
          const allocationResponse = await api.get(`/budget-sources/${source.id}/offices`);
          const allocationsForSource = Array.isArray(allocationResponse.data) ? allocationResponse.data : [];
          for (const allocation of allocationsForSource) {
            const office = organizationMap.get(String(allocation.organizationId));
            const officeName = office?.nameBn || office?.name || `Office ${allocation.organizationId}`;
            if (!isProjectSource) officeOptions.push({
              id: allocation.id,
              label: `${officeName} — ${category.categoryName || category.categoryCode} / ${source.sourceCode}`,
            });

            if (isProjectSource) {
              const projectResponse = await api.get(`/office-allocations/${allocation.id}/projects`);
              const projects = Array.isArray(projectResponse.data) ? projectResponse.data : [];
              projects.forEach((project) => projectOptions.push({
                id: project.id,
                label: `${project.projectNameBn || project.projectName} (${project.projectCode}) — ${officeName}`,
              }));
            }
          }
        }
      }
      setAssignments({ projects: projectOptions, offices: officeOptions });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not load active fiscal year assignments.");
    } finally {
      setAssignmentsLoading(false);
    }
  };
  const create = async (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    try {
      await api.post("/auth/users", { email, password, role, assignedProjectId: projectId ? Number(projectId) : null, assignedOfficeAllocationId: officeId ? Number(officeId) : null });
      setEmail(""); setPassword(""); setProjectId(""); setOfficeId(""); setSuccess("Account created. The user must change this password at first sign in."); await load();
    } catch (err) { setError(err.response?.data?.message || "Could not create account."); }
  };
  return <div className="page-container">
    <div className="page-header"><div><h1>User Management</h1><p>Create accounts and assign access roles.</p></div></div>
    {error && <div className="error-message">{error}</div>}{success && <div className="success-message">{success}</div>}
    <form className="content-card form-card" onSubmit={create}>
      <div className="card-heading"><h2>Create account</h2><p>Temporary passwords must be at least 10 characters.{activeFiscalYear ? ` Assignments are from ${activeFiscalYear.name}.` : ""}</p></div>
      <div className="form-grid">
        <div className="form-group"><label>Email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="form-group"><label>Temporary password</label><input type="password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="form-group"><label>Role</label><select value={role} onChange={(e) => setRole(e.target.value)}><option value="USER">User — reports only</option><option value="ADMIN">Admin — assigned input task</option><option value="SUPER_ADMIN">Super admin — full access</option></select></div>
        {role === "ADMIN" && <>
          <div className="form-group"><label>Assigned project (optional)</label><select disabled={assignmentsLoading} value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">No project</option>{assignments.projects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
          <div className="form-group"><label>Assigned office (optional)</label><select disabled={assignmentsLoading} value={officeId} onChange={(e) => setOfficeId(e.target.value)}><option value="">No office</option>{assignments.offices.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
          <p className="form-hint full-width">Select at least one assignment. Admins can submit expenditure input only for their assigned project or office allocation.</p>
        </>}
      </div>
      <div className="form-actions"><button className="primary-button">Create user</button></div>
    </form>
    <div className="content-card"><div className="card-heading"><h2>Accounts</h2></div><div className="table-wrapper"><table><thead><tr><th>Email</th><th>Role</th><th>Assigned project</th><th>Assigned office</th><th>First sign in</th></tr></thead><tbody>
      {users.map((u) => <tr key={u.id}><td>{u.email}</td><td>{u.role.replace("_", " ")}</td><td>{u.assignedProjectId ? assignments.projects.find((item) => String(item.id) === String(u.assignedProjectId))?.label || `Project #${u.assignedProjectId}` : "—"}</td><td>{u.assignedOfficeAllocationId ? assignments.offices.find((item) => String(item.id) === String(u.assignedOfficeAllocationId))?.label || `Office allocation #${u.assignedOfficeAllocationId}` : "—"}</td><td>{u.mustChangePassword ? "Password change required" : "Complete"}</td></tr>)}
      {users.length === 0 && <tr><td colSpan="5" className="empty-cell">No accounts found.</td></tr>}
    </tbody></table></div></div>
  </div>;
}
