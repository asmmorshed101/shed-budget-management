
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const initialForm = {
  isParentOffice: true,
  organizationTypeId: "",
  code: "",
  name: "",
  nameBn: "",
};

export default function OfficeManagement() {
  const [organizations, setOrganizations] = useState([]);
  const [organizationTypes, setOrganizationTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [organizationResponse, typeResponse] = await Promise.all([
        api.get("/organizations/hierarchy"),
        api.get("/organization-types"),
      ]);

      setOrganizations(
        Array.isArray(organizationResponse.data)
          ? organizationResponse.data
          : []
      );

      setOrganizationTypes(
        Array.isArray(typeResponse.data) ? typeResponse.data : []
      );
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to load office information."));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (err, fallback) => {
    const data = err.response?.data;

    if (typeof data === "string") return data;

    return data?.message || data?.error || fallback;
  };

  const organizationMap = useMemo(
    () => new Map(organizations.map((org) => [org.id, org])),
    [organizations]
  );

  const parentOffice = organizations.find((office) => !office.parentId) || null;

  const getParentName = (parentId) => {
    if (!parentId) return "Top Level";
    const parent = organizationMap.get(parentId);
    return parent?.nameBn || parent?.name || "Unknown";
  };

  const filteredOrganizations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return organizations;

    return organizations.filter((office) =>
      [
        office.code,
        office.name,
        office.nameBn,
        office.organizationTypeName,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
    );
  }, [organizations, search]);

  const activeCount = organizations.filter(
    (office) => office.isActive !== false
  ).length;

  const openCreateForm = () => {
    setEditingOffice(null);
    setForm({ ...initialForm, isParentOffice: !parentOffice });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (office) => {
    setEditingOffice(office);

    setForm({
      isParentOffice: !office.parentId,
      organizationTypeId: String(office.organizationTypeId || ""),
      code: office.code || "",
      name: office.name || "",
      nameBn: office.nameBn || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingOffice(null);
    setForm(initialForm);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.organizationTypeId) {
      setError("Please select an organization type.");
      return;
    }

    if (!form.code.trim() || !form.name.trim() || !form.nameBn.trim()) {
      setError("Code, English name and Bangla name are required.");
      return;
    }

    if (!editingOffice && !parentOffice && !form.isParentOffice) {
      setError("Create the parent office first by selecting the parent office checkbox.");
      return;
    }

    const request = {
      parentId: form.isParentOffice ? null : parentOffice?.id || null,
      organizationTypeId: Number(form.organizationTypeId),
      code: form.code.trim(),
      name: form.name.trim(),
      nameBn: form.nameBn.trim(),
    };

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingOffice) {
        await api.put(
          `/organizations/${editingOffice.id}`,
          request
        );

        setSuccess("Office updated successfully.");
      } else {
        await api.post("/organizations", request);

        setSuccess("New office created successfully.");
      }

      closeForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to save office."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (office) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${office.name}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.patch(`/organizations/${office.id}/deactivate`);

      setSuccess("Office deactivated successfully.");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to deactivate office."));
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        Loading office information...
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Office Management</h1>
          <p>
            Create and manage offices under Secondary and Higher Education
            Division.
          </p>
        </div>

        <div className="office-header-actions">
          <button
            className="secondary-button"
            onClick={loadData}
          >
            Refresh
          </button>

          <button
            className="primary-button"
            onClick={openCreateForm}
          >
            + Add New Office
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {String(error)}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="source-summary-grid">
        <div className="summary-card">
          <span>Total Offices</span>
          <h3>{organizations.length}</h3>
        </div>

        <div className="summary-card">
          <span>Active Offices</span>
          <h3>{activeCount}</h3>
        </div>

        <div className="summary-card">
          <span>Inactive Offices</span>
          <h3>{organizations.length - activeCount}</h3>
        </div>
      </div>

      {showForm && (
        <section className="budget-section form-section">
          <div className="section-heading">
            <div>
              <h2>
                {editingOffice ? "Edit Office" : "Add New Office"}
              </h2>
              <p>Enter the office information below.</p>
            </div>

            <button
              className="secondary-button"
              onClick={closeForm}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Office Code</label>
                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Example: DSHE"
                  maxLength={40}
                  required
                />
              </div>

              <div className="form-group">
                <label>Organization Type</label>
                <select
                  name="organizationTypeId"
                  value={form.organizationTypeId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Organization Type</option>

                  {organizationTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.nameBn || type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Office Name (English)</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter office name"
                  maxLength={255}
                  required
                />
              </div>

              <div className="form-group">
                <label>Office Name (Bangla)</label>
                <input
                  type="text"
                  name="nameBn"
                  value={form.nameBn}
                  onChange={handleChange}
                  placeholder="অফিসের বাংলা নাম"
                  maxLength={255}
                  required
                />
              </div>

              <div className="form-group full-width">
                {!parentOffice && !editingOffice ? (
                  <div className="office-parent-checkbox">
                    <input
                      type="checkbox"
                      id="is-parent-office"
                      className="office-parent-checkbox-input"
                      name="isParentOffice"
                      checked={form.isParentOffice}
                      onChange={(event) => setForm((previous) => ({
                        ...previous,
                        isParentOffice: event.target.checked,
                      }))}
                    />{" "}
                    <label htmlFor="is-parent-office">This is the parent office</label>
                  </div>
                ) : form.isParentOffice ? (
                  <>
                    <label>Office level</label>
                    <div>Parent office</div>
                  </>
                ) : (
                  <>
                    <label>Parent Office</label>
                    <div>{parentOffice?.nameBn || parentOffice?.name || "Parent office"}</div>
                  </>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingOffice
                  ? "Update Office"
                  : "Save Office"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="budget-section">
        <div className="section-heading">
          <div>
            <h2>Office List</h2>
            <p>All registered organizations and offices.</p>
          </div>
        </div>

        <div className="office-search">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by office code or name..."
          />
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Office Name</th>
                <th>Organization Type</th>
                <th>Parent Office</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-cell">
                    No offices found.
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map((office) => (
                  <tr key={office.id}>
                    <td>{office.code}</td>

                    <td>
                      <strong>{office.name}</strong>
                      <div className="office-name-bn">
                        {office.nameBn}
                      </div>
                    </td>

                    <td>{office.organizationTypeName || "-"}</td>

                    <td>{getParentName(office.parentId)}</td>

                    <td>
                      <span
                        className={`project-status ${
                          office.isActive !== false ? "active" : ""
                        }`}
                      >
                        {office.isActive !== false ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>

                    <td>
                      <div className="office-actions">
                        <button
                          className="edit-button"
                          onClick={() => openEditForm(office)}
                        >
                          Edit
                        </button>

                        {office.isActive !== false && (
                          <button
                            className="office-deactivate-button"
                            onClick={() => handleDeactivate(office)}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
