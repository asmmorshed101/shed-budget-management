
import { useEffect, useState } from "react";

import {
  getFiscalYears,
  createFiscalYear,
  updateFiscalYear,
  activateFiscalYear,
} from "../services/fiscalYearService";

const initialForm = {
  name: "",
  startDate: "",
  endDate: "",
};

function FiscalYears() {
  const [fiscalYears, setFiscalYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(initialForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load Fiscal Years
  const loadFiscalYears = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getFiscalYears();

      setFiscalYears(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Failed to load fiscal years."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiscalYears();
  }, []);

  // Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Open Create Form
  const openCreateForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // Create or Update
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.startDate >= formData.endDate) {
      setError("End date must be after start date.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingId) {
        await updateFiscalYear(editingId, formData);
        setSuccess("Fiscal year updated successfully.");
      } else {
        await createFiscalYear(formData);
        setSuccess("Fiscal year created successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(initialForm);

      await loadFiscalYears();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  // Edit Fiscal Year
  const handleEdit = (year) => {
    setEditingId(year.id);

    setFormData({
      name: year.name || "",
      startDate: year.startDate || "",
      endDate: year.endDate || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // Activate Fiscal Year
  const handleActivate = async (id) => {
    const confirmed = window.confirm(
      "Do you want to activate this fiscal year?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await activateFiscalYear(id);

      setSuccess("Fiscal year activated successfully.");

      await loadFiscalYears();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to activate fiscal year."
      );
    }
  };

  // Cancel Form
  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialForm);
    setError("");
  };

  if (loading) {
    return (
      <div className="page-container">
        Loading fiscal years...
      </div>
    );
  }

  return (
    <div className="page-container">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Fiscal Year Management</h1>
          <p>Manage government financial years.</p>
        </div>

        <button
          className="primary-button"
          onClick={openCreateForm}
        >
          + Add Fiscal Year
        </button>
      </div>

      {/* Messages */}
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

      {/* Create / Edit Form */}
      {showForm && (
        <section className="budget-section form-section">

          <div className="section-heading">
            <div>
              <h2>
                {editingId
                  ? "Edit Fiscal Year"
                  : "Create Fiscal Year"}
              </h2>
              <p>Enter fiscal year information.</p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">

              <div className="form-group">
                <label>Fiscal Year Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="2026-2027"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>

            </div>

            <div className="form-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={handleCancel}
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
                  : editingId
                  ? "Update Fiscal Year"
                  : "Save Fiscal Year"}
              </button>

            </div>
          </form>
        </section>
      )}

      {/* Fiscal Year List */}
      <section className="budget-section">

        <div className="section-heading">
          <div>
            <h2>Fiscal Year List</h2>
            <p>All registered government financial years.</p>
          </div>

          <button
            className="secondary-button"
            onClick={loadFiscalYears}
          >
            Refresh
          </button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">

            <thead>
              <tr>
                <th>SL</th>
                <th>Fiscal Year</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {fiscalYears.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-cell">
                    No fiscal years found.
                  </td>
                </tr>
              ) : (
                fiscalYears.map((year, index) => (
                  <tr key={year.id}>

                    <td>{index + 1}</td>

                    <td>
                      <strong>{year.name}</strong>
                    </td>

                    <td>{year.startDate}</td>

                    <td>{year.endDate}</td>

                    <td>
                      <span
                        className={`project-status ${
                          year.isActive ? "active" : ""
                        }`}
                      >
                        {year.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>

                    <td>
                      <div className="office-actions">

                        <button
                          className="edit-button"
                          onClick={() => handleEdit(year)}
                        >
                          Edit
                        </button>

                        {!year.isActive && (
                          <button
                            className="office-deactivate-button"
                            onClick={() =>
                              handleActivate(year.id)
                            }
                          >
                            Activate
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

export default FiscalYears;
