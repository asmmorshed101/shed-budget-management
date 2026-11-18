
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Save,
  X,
  RefreshCw,
  Search,
  Tags,
  CheckCircle,
  XCircle,
  Power,
} from "lucide-react";

import api from "../api/axios";

export default function ExpenseHeads() {
  // Data
  const [heads, setHeads] = useState([]);

  // Loading
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search and filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    nameBn: "",
  });

  // Load all expense heads
  const loadHeads = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/expense-heads");
      setHeads(response.data || []);
    } catch (err) {
      console.error("Expense Heads loading error:", err);

      setError(
        err.response?.data?.message ||
        "Unable to load Expense Heads."
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadHeads();
  }, []);

  // Statistics
  const totalHeads = heads.length;

  const activeHeads = heads.filter(
    (head) => head.active === true
  ).length;

  const inactiveHeads = totalHeads - activeHeads;

  // Search and filter
  const filteredHeads = useMemo(() => {
    return heads.filter((head) => {
      const keyword = search.trim().toLowerCase();

      const matchesSearch =
        String(head.code || "").toLowerCase().includes(keyword) ||
        String(head.name || "").toLowerCase().includes(keyword) ||
        String(head.nameBn || "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && head.active === true) ||
        (statusFilter === "INACTIVE" && head.active === false);

      return matchesSearch && matchesStatus;
    });
  }, [heads, search, statusFilter]);

  // Reset form
  const resetForm = () => {
    setForm({
      code: "",
      name: "",
      nameBn: "",
    });

    setEditingId(null);
    setShowForm(false);
  };

  // Open create form
  const openCreateForm = () => {
    setError("");
    setSuccess("");

    setForm({
      code: "",
      name: "",
      nameBn: "",
    });

    setEditingId(null);
    setShowForm(true);
  };

  // Open edit form
  const openEditForm = (head) => {
    setError("");
    setSuccess("");

    setForm({
      code: head.code || "",
      name: head.name || "",
      nameBn: head.nameBn || "",
    });

    setEditingId(head.id);
    setShowForm(true);
  };

  // Form input change
  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Create or update
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.code.trim()) {
      setError("Expense Head Code is required.");
      return;
    }

    if (!form.name.trim()) {
      setError("English Name is required.");
      return;
    }

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      nameBn: form.nameBn.trim(),
    };

    try {
      setLoading(true);

      if (editingId) {
        await api.put(
          `/expense-heads/${editingId}`,
          payload
        );

        setSuccess("Expense Head updated successfully.");
      } else {
        await api.post(
          "/expense-heads",
          payload
        );

        setSuccess("New Expense Head created successfully.");
      }

      resetForm();
      await loadHeads();

    } catch (err) {
      console.error("Expense Head save error:", err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to save Expense Head."
      );
    } finally {
      setLoading(false);
    }
  };

  // Activate or Deactivate
  const handleStatusChange = async (head) => {
    const action = head.active
      ? "deactivate"
      : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${head.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      setLoading(true);

      await api.patch(
        `/expense-heads/${head.id}/${action}`
      );

      setSuccess(
        `Expense Head ${action}d successfully.`
      );

      await loadHeads();

    } catch (err) {
      console.error("Status update error:", err);

      setError(
        err.response?.data?.message ||
        `Unable to ${action} Expense Head.`
      );
    } finally {
      setLoading(false);
    }
  };

  // Refresh
  const handleRefresh = async () => {
    await loadHeads();
  };

  return (
    <div>

      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Expense Heads Management</h1>
          <p>
            Manage expenditure heads, codes and their active status.
          </p>
        </div>

        <div className="filter-actions">
          <button
            className="secondary-button"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className="primary-button"
            onClick={openCreateForm}
          >
            <Plus size={16} />
            Add New Head
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {/* Statistics */}
      <section className="stat-grid">

        <div className="stat-card">
          <div className="stat-info">
            <p>Total Expense Heads</p>
            <h2>{totalHeads}</h2>
            <span>All registered heads</span>
          </div>

          <div className="stat-icon blue">
            <Tags size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <p>Active Heads</p>
            <h2>{activeHeads}</h2>
            <span>Available for expenditure entry</span>
          </div>

          <div className="stat-icon green">
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <p>Inactive Heads</p>
            <h2>{inactiveHeads}</h2>
            <span>Not available for new entries</span>
          </div>

          <div className="stat-icon orange">
            <XCircle size={22} />
          </div>
        </div>

      </section>

      {/* Expense Head Form */}
      {showForm && (
        <section className="content-card form-card">

          <div className="card-heading form-heading">
            <div>
              <h2>
                {editingId
                  ? "Edit Expense Head"
                  : "Add New Expense Head"}
              </h2>

              <p>
                Enter expenditure head information below.
              </p>
            </div>

            <button
              className="icon-button"
              onClick={resetForm}
              disabled={loading}
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              <div className="form-group">
                <label>
                  Expense Head Code *
                </label>

                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleFormChange}
                  placeholder="Enter expense head code"
                  maxLength={50}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  English Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Enter English name"
                  maxLength={150}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  বাংলা নাম
                </label>

                <input
                  type="text"
                  name="nameBn"
                  value={form.nameBn}
                  onChange={handleFormChange}
                  placeholder="বাংলায় খাতের নাম লিখুন"
                  maxLength={150}
                />
              </div>

            </div>

            <div className="form-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                <Save size={16} />

                {loading
                  ? "Saving..."
                  : editingId
                  ? "Update Expense Head"
                  : "Save Expense Head"}
              </button>

            </div>

          </form>
        </section>
      )}

      {/* Expense Head List */}
      <section className="content-card">

        <div className="card-heading">
          <h2>Expenditure Head List</h2>
          <p>
            View and manage all active and inactive expenditure heads.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="expense-head-toolbar">

          <div className="expense-head-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search by code, English or Bangla name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="expense-head-filter">
            <label>Status</label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Heads</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

        </div>

        {/* Table */}
        {initialLoading ? (
          <div className="loading-state">
            Loading Expense Heads...
          </div>
        ) : (
          <div className="table-wrapper">

            <table className="data-table">

              <thead>
                <tr>
                  <th>SL</th>
                  <th>Code</th>
                  <th>English Name</th>
                  <th>বাংলা নাম</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {filteredHeads.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      No Expense Heads found.
                    </td>
                  </tr>
                ) : (
                  filteredHeads.map((head, index) => (
                    <tr key={head.id}>

                      <td>{index + 1}</td>

                      <td>
                        <span className="source-badge">
                          {head.code}
                        </span>
                      </td>

                      <td>
                        <strong>{head.name}</strong>
                      </td>

                      <td>
                        {head.nameBn || "—"}
                      </td>

                      <td>
                        <span
                          className={`project-status ${
                            head.active ? "active" : ""
                          }`}
                          style={
                            !head.active
                              ? {
                                  background: "#f1f5f9",
                                  color: "#64748b",
                                }
                              : {}
                          }
                        >
                          {head.active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <div className="expense-head-actions">

                          <button
                            className="table-action"
                            onClick={() => openEditForm(head)}
                            disabled={loading}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            className={
                              head.active
                                ? "expense-deactivate-button"
                                : "expense-activate-button"
                            }
                            onClick={() => handleStatusChange(head)}
                            disabled={loading}
                          >
                            <Power size={14} />

                            {head.active
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))
                )}

              </tbody>

            </table>

          </div>
        )}

        <div className="expense-head-footer">
          Showing {filteredHeads.length} of {totalHeads} Expense Heads
        </div>

      </section>

    </div>
  );
}
