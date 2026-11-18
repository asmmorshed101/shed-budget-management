import { useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import api from "../api/axios";
import { loadActiveMinistryContext } from "../services/budgetContext";

const formatAmount = (amount) =>
  Number(amount || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  });

const getErrorMessage = (err, fallback) => {
  const data = err.response?.data;
  if (typeof data === "string") return data;
  return data?.message || data?.error || fallback;
};

const initialForm = {
  projectCode: "",
  projectName: "",
  projectNameBn: "",
  allocatedAmount: "",
  startDate: "",
  endDate: "",
  remarks: "",
};

export default function Projects() {
  const [fiscalYears, setFiscalYears] = useState([]);
  const [fiscalYearId, setFiscalYearId] = useState("");
  const [organizationId, setOrganizationId] = useState("");

  const [organizations, setOrganizations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedAllocationId, setSelectedAllocationId] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState(initialForm);

  // Load fiscal years and SHED organization; default to active fiscal year.
  useEffect(() => {
    loadInitialData();
    // Initial page load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async (requestedYearId = null) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setProjects([]);
      setAllocations([]);
      setSelectedAllocationId("");
      setShowForm(false);

      const [{ activeFiscalYear, fiscalYears: years, ministry }, organizationResponse] =
        await Promise.all([
          loadActiveMinistryContext(),
          api.get("/organizations/hierarchy"),
        ]);
      const orgs = Array.isArray(organizationResponse.data) ? organizationResponse.data : [];

      setFiscalYears(years);
      setOrganizations(orgs);

      setOrganizationId(ministry.id);

      const chosenYear = requestedYearId
        ? years.find((year) => String(year.id) === String(requestedYearId))
        : activeFiscalYear;

      if (!chosenYear) {
        setFiscalYearId("");
        setError("No Fiscal Year was found.");
        return;
      }

      setFiscalYearId(String(chosenYear.id));
      await loadDevelopmentAdpAllocations(chosenYear.id, ministry.id);
    } catch (err) {
      console.error("Project initial loading error:", err);
      setError(getErrorMessage(err, "Failed to load Fiscal Year or Ministry information."));
    } finally {
      setLoading(false);
    }
  };

  const loadDevelopmentAdpAllocations = async (yearId, orgId) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setProjects([]);
      setAllocations([]);
      setSelectedAllocationId("");
      setShowForm(false);
      setEditingProject(null);

      const budgetResponse = await api.get("/ministry-budgets/by-fiscal-year", {
        params: { fiscalYearId: yearId, organizationId: orgId },
      });
      const budget = budgetResponse.data;

      if (!budget?.id) {
        setError("Ministry Budget not found for the selected Fiscal Year.");
        return;
      }

      const categoryResponse = await api.get(
        `/ministry-budgets/${budget.id}/categories`
      );
      const categoryData = Array.isArray(categoryResponse.data)
        ? categoryResponse.data
        : [];
      setCategories(categoryData);

      const developmentCategory = categoryData.find(
        (item) => item.categoryCode?.toUpperCase() === "DEVELOPMENT"
      );

      if (!developmentCategory) {
        setError("Development category not found for the selected Fiscal Year.");
        return;
      }

      const sourceResponse = await api.get(
        `/budget-categories/${developmentCategory.id}/sources`
      );
      const sourceData = Array.isArray(sourceResponse.data)
        ? sourceResponse.data
        : [];

      const adpSource = sourceData.find(
        (item) => item.sourceCode?.toUpperCase() === "ADP"
      );

      if (!adpSource) {
        setError("Development ADP source not found for the selected Fiscal Year.");
        return;
      }

      const allocationResponse = await api.get(
        `/budget-sources/${adpSource.id}/offices`
      );
      const allocationData = Array.isArray(allocationResponse.data)
        ? allocationResponse.data
        : [];

      // Only offices with a positive Development ADP allocation appear.
      const fundedAllocations = allocationData.filter(
        (item) => Number(item.allocatedAmount || 0) > 0
      );

      setAllocations(fundedAllocations);
      if (fundedAllocations.length > 0) {
        setSelectedAllocationId(String(fundedAllocations[0].id));
      } else {
        setError("No offices have a Development ADP allocation for this Fiscal Year.");
      }
    } catch (err) {
      console.error("Development ADP allocation loading error:", err);
      setError(
        getErrorMessage(err, "Failed to load Development ADP office allocations.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFiscalYearChange = async (event) => {
    const yearId = event.target.value;
    setFiscalYearId(yearId);
    if (yearId && organizationId) {
      await loadDevelopmentAdpAllocations(yearId, organizationId);
    }
  };

  const organizationMap = useMemo(
    () => new Map(organizations.map((org) => [org.id, org])),
    [organizations]
  );

  const selectedAllocation = allocations.find(
    (item) => String(item.id) === String(selectedAllocationId)
  );

  const getOfficeName = (id) => {
    const office = organizationMap.get(id);
    return office?.nameBn || office?.name || id;
  };

  useEffect(() => {
    if (selectedAllocationId) {
      loadProjects(selectedAllocationId);
    } else {
      setProjects([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAllocationId]);

  const loadProjects = async (allocationId) => {
    try {
      setLoadingProjects(true);
      setError("");
      const response = await api.get(`/office-allocations/${allocationId}/projects`);
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Project loading error:", err);
      setProjects([]);
      setError(getErrorMessage(err, "Failed to load projects."));
    } finally {
      setLoadingProjects(false);
    }
  };

  const projectTotal = projects.reduce(
    (total, project) => total + Number(project.allocatedAmount || 0),
    0
  );
  const officeBudget = Number(selectedAllocation?.allocatedAmount || 0);
  const remainingAmount = officeBudget - projectTotal;

  const openCreateForm = () => {
    if (!selectedAllocation) {
      setError("Please select an office with Development ADP allocation.");
      return;
    }
    setEditingProject(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (project) => {
    setEditingProject(project);
    setForm({
      projectCode: project.projectCode || "",
      projectName: project.projectName || "",
      projectNameBn: project.projectNameBn || "",
      allocatedAmount: String(project.allocatedAmount ?? ""),
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      remarks: project.remarks || "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProject(null);
    setForm(initialForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedAllocation) {
      setError("Please select an office allocation.");
      return;
    }
    if (!form.projectCode.trim() || !form.projectName.trim()) {
      setError("Project code and project name are required.");
      return;
    }

    const amount = Number(form.allocatedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a project allocation greater than zero.");
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    const otherProjectTotal = projects
      .filter((project) => project.id !== editingProject?.id)
      .reduce((total, project) => total + Number(project.allocatedAmount || 0), 0);

    if (otherProjectTotal + amount > officeBudget) {
      setError(
        `Project allocations exceed this office's Development ADP allocation. Available amount: ৳ ${formatAmount(
          officeBudget - otherProjectTotal
        )}.`
      );
      return;
    }

    const request = {
      projectCode: form.projectCode.trim(),
      projectName: form.projectName.trim(),
      projectNameBn: form.projectNameBn.trim() || null,
      allocatedAmount: amount,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      remarks: form.remarks.trim(),
    };

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, request);
        setSuccess("Project updated successfully.");
      } else {
        await api.post(`/office-allocations/${selectedAllocation.id}/projects`, request);
        setSuccess("Project created successfully.");
      }
      closeForm();
      await loadProjects(selectedAllocation.id);
    } catch (err) {
      console.error("Project save error:", err);
      setError(getErrorMessage(err, "Failed to save project."));
    } finally {
      setSaving(false);
    }
  };

  const selectedFiscalYear = fiscalYears.find(
    (year) => String(year.id) === String(fiscalYearId)
  );

  if (loading) {
    return <div className="page-container">Loading Project Management...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Project Management</h1>
          <p>Manage projects under Development ADP office allocations.</p>
        </div>
        <button className="secondary-button" onClick={() => loadInitialData(fiscalYearId)}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{String(error)}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <section className="budget-section">
        <div className="section-heading">
          <div>
            <h2><CalendarDays size={18} /> Fiscal Year & Office Selection</h2>
            <p>Select a fiscal year, then choose an office that has Development ADP allocation.</p>
          </div>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Fiscal Year</label>
            <select value={fiscalYearId} onChange={handleFiscalYearChange}>
              {fiscalYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}{year.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
            {selectedFiscalYear && (
              <small className="form-hint">
                {selectedFiscalYear.isActive ? "Active Fiscal Year" : "Selected Fiscal Year"}: {selectedFiscalYear.name}
              </small>
            )}
          </div>
          <div className="form-group">
            <label>Office (Development ADP Allocations)</label>
            <select
              value={selectedAllocationId}
              onChange={(event) => {
                setSelectedAllocationId(event.target.value);
                setShowForm(false);
                setError("");
                setSuccess("");
              }}
              disabled={allocations.length === 0}
            >
              {allocations.length === 0 ? (
                <option value="">No funded offices found</option>
              ) : (
                allocations.map((allocation) => (
                  <option key={allocation.id} value={allocation.id}>
                    {getOfficeName(allocation.organizationId)} — ADP Budget: ৳ {formatAmount(allocation.allocatedAmount)}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </section>

      {selectedAllocation && (
        <>
          <div className="source-summary-grid">
            <div className="summary-card">
              <span>Office</span>
              <h3>{getOfficeName(selectedAllocation.organizationId)}</h3>
            </div>
            <div className="summary-card">
              <span>Office Development ADP Allocation</span>
              <h3>৳ {formatAmount(officeBudget)}</h3>
            </div>
            <div className="summary-card">
              <span>Project Allocated</span>
              <h3>৳ {formatAmount(projectTotal)}</h3>
            </div>
            <div className="summary-card">
              <span>Remaining Amount</span>
              <h3>৳ {formatAmount(remainingAmount)}</h3>
            </div>
          </div>

          <section className="budget-section">
            <div className="section-heading">
              <div>
                <h2>Project List</h2>
                <p>Projects created under this office's Development ADP allocation for {selectedFiscalYear?.name}.</p>
              </div>
              <button className="primary-button" onClick={openCreateForm} disabled={remainingAmount <= 0}>
                + Add New Project
              </button>
            </div>

            {loadingProjects ? (
              <div className="empty-state">Loading projects...</div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Project Code</th>
                      <th>Project Name</th>
                      <th>Allocation</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length === 0 ? (
                      <tr><td colSpan="7" className="empty-cell">No projects found for this office.</td></tr>
                    ) : (
                      projects.map((project) => (
                        <tr key={project.id}>
                          <td>{project.projectCode}</td>
                          <td>
                            <strong>{project.projectName}</strong>
                            {project.projectNameBn && <div className="project-name-bn">{project.projectNameBn}</div>}
                          </td>
                          <td className="amount-cell">৳ {formatAmount(project.allocatedAmount)}</td>
                          <td>{project.startDate || "-"}</td>
                          <td>{project.endDate || "-"}</td>
                          <td>
                            <span className={`project-status ${project.status === "ACTIVE" ? "active" : ""}`}>
                              {project.status || "N/A"}
                            </span>
                          </td>
                          <td>
                            <button className="edit-button" onClick={() => openEditForm(project)}>Edit</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {showForm && (
            <section className="budget-section form-section">
              <div className="section-heading">
                <div>
                  <h2>{editingProject ? "Edit Project" : "Add New Project"}</h2>
                  <p>Office: {getOfficeName(selectedAllocation.organizationId)} — ADP Budget: ৳ {formatAmount(officeBudget)}</p>
                </div>
                <button className="secondary-button" onClick={closeForm}>Cancel</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Project Code</label>
                    <input
                      type="text"
                      name="projectCode"
                      value={form.projectCode}
                      onChange={handleChange}
                      disabled={Boolean(editingProject)}
                      placeholder="Example: DEV-001"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Project Name (English)</label>
                    <input type="text" name="projectName" value={form.projectName} onChange={handleChange} placeholder="Enter project name" required />
                  </div>
                  <div className="form-group">
                    <label>Project Name (Bangla)</label>
                    <input type="text" name="projectNameBn" value={form.projectNameBn} onChange={handleChange} placeholder="প্রকল্পের বাংলা নাম" />
                  </div>
                  <div className="form-group">
                    <label>Project Allocation (BDT)</label>
                    <input
                      type="number"
                      name="allocatedAmount"
                      value={form.allocatedAmount}
                      onChange={handleChange}
                      min="0.01"
                      max={officeBudget}
                      step="0.01"
                      placeholder="Enter project allocation"
                      required
                    />
                    <small className="form-hint">Available: ৳ {formatAmount(remainingAmount + (editingProject ? Number(editingProject.allocatedAmount || 0) : 0))}</small>
                  </div>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" name="startDate" value={form.startDate} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" name="endDate" value={form.endDate} onChange={handleChange} />
                  </div>
                  <div className="form-group full-width">
                    <label>Remarks</label>
                    <textarea name="remarks" value={form.remarks} onChange={handleChange} rows="3" placeholder="Enter remarks" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={closeForm}>Cancel</button>
                  <button type="submit" className="primary-button" disabled={saving}>
                    {saving ? "Saving..." : editingProject ? "Update Project" : "Save Project"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}
