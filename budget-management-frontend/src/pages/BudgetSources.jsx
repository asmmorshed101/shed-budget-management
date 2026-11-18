
import { useEffect, useState } from "react";
import {
  RefreshCw,
  CalendarDays,
  Building2,
  Wallet,
  Plus,
  Pencil,
  Save,
  X,
  Layers,
} from "lucide-react";

import api from "../api/axios";
import { loadActiveMinistryContext } from "../services/budgetContext";

const formatAmount = (amount) =>
  Number(amount || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  });

const CATEGORY_NAMES = {
  OPERATIONAL: "পরিচালন বাজেট",
  SEDP: "এসইডিপি",
  DEVELOPMENT: "উন্নয়ন বাজেট",
};

const SOURCE_CODES = ["ADP", "BLOCK"];

export default function BudgetSources() {
  // Dropdown data
  const [fiscalYears, setFiscalYears] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  // Selected values
  const [fiscalYearId, setFiscalYearId] = useState("");
  const [organizationId, setOrganizationId] = useState("");

  // Budget data
  const [budget, setBudget] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sources, setSources] = useState([]);

  // Loading and messages
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [budgetNotFound, setBudgetNotFound] = useState(false);

  // Forms
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);

  const [form, setForm] = useState({
    sourceCode: "ADP",
    amount: "",
    remarks: "",
  });

  // Load Fiscal Years and Organizations
  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    try {
      setInitialLoading(true);
      setError("");

      const { fiscalYears: years, organizations: allOrganizations, activeFiscalYear, ministry } =
        await loadActiveMinistryContext();

      setFiscalYears(years);

      // Only active Ministries
      const ministries = allOrganizations.filter(
        (org) =>
          org.organizationType?.code === "MINISTRY" &&
          org.isActive === true
      );

      setOrganizations(ministries);

      // Select Active Fiscal Year
      const defaultYear = activeFiscalYear;
      const defaultOrganization = ministry;

      if (!defaultYear || !defaultOrganization) {
        setError(
          "Active Fiscal Year or Ministry information not found."
        );
        return;
      }

      setFiscalYearId(String(defaultYear.id));
      setOrganizationId(defaultOrganization.id);

      await loadBudgetData(
        defaultYear.id,
        defaultOrganization.id
      );
    } catch (err) {
      console.error("Initial loading error:", err);

      setError(
        err.response?.data?.message ||
        "Failed to load Fiscal Year or Ministry information."
      );
    } finally {
      setInitialLoading(false);
    }
  };

  // Load Ministry Budget and Categories
  const loadBudgetData = async (yearId, orgId) => {
    if (!yearId || !orgId) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setBudgetNotFound(false);

      setBudget(null);
      setCategories([]);
      setSelectedCategory(null);
      setSources([]);
      setShowForm(false);

      const budgetResponse = await api.get(
        "/ministry-budgets/by-fiscal-year",
        {
          params: {
            fiscalYearId: yearId,
            organizationId: orgId,
          },
        }
      );

      const budgetData = budgetResponse.data;

      if (!budgetData?.id) {
        setBudgetNotFound(true);
        return;
      }

      setBudget(budgetData);

      // Load categories
      const categoryResponse = await api.get(
        `/ministry-budgets/${budgetData.id}/categories`
      );

      const categoryData = Array.isArray(categoryResponse.data)
        ? categoryResponse.data
        : [];

      setCategories(categoryData);

      if (categoryData.length === 0) {
        setError(
          "No budget categories found for this Ministry Budget."
        );
      }
    } catch (err) {
      console.error(
        "Budget loading error:",
        err.config?.url,
        err.response?.status,
        err.response?.data
      );

      setBudget(null);
      setCategories([]);
      setSelectedCategory(null);
      setSources([]);

      const message =
        err.response?.data?.message || "";

      if (
        err.response?.status === 404 ||
        message.toLowerCase().includes("ministry budget not found")
      ) {
        setBudgetNotFound(true);
        setError("");
      } else {
        setError(
          message ||
          "Failed to load Ministry Budget information."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Load Sources whenever selected Category changes
  useEffect(() => {
    if (selectedCategory?.id) {
      loadSources(selectedCategory.id);
    } else {
      setSources([]);
    }
  }, [selectedCategory]);

  const loadSources = async (categoryId) => {
    try {
      setError("");
      setSources([]);

      const response = await api.get(
        `/budget-categories/${categoryId}/sources`
      );

      setSources(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      console.error(
        "Source loading error:",
        err.response?.data
      );

      setSources([]);

      setError(
        err.response?.data?.message ||
        "Failed to load budget sources."
      );
    }
  };

  // Selected values
  const selectedFiscalYear = fiscalYears.find(
    (year) => String(year.id) === String(fiscalYearId)
  );

  const selectedMinistry = organizations.find(
    (org) => org.id === organizationId
  );

  const isSedp =
    selectedCategory?.categoryCode?.toUpperCase() === "SEDP";

  // Source calculations
  const sourceTotal = sources.reduce(
    (total, source) =>
      total + Number(source.amount || 0),
    0
  );

  const categoryAmount = Number(
    selectedCategory?.totalAmount || 0
  );

  const remainingAmount = categoryAmount - sourceTotal;

  const sourceExists = (code) =>
    sources.some(
      (source) =>
        source.sourceCode?.toUpperCase() ===
        code.toUpperCase()
    );

  const availableSources = SOURCE_CODES.filter(
    (code) => !sourceExists(code)
  );

  // Change Fiscal Year
  const handleFiscalYearChange = async (e) => {
    const yearId = e.target.value;

    setFiscalYearId(yearId);

    if (yearId && organizationId) {
      await loadBudgetData(yearId, organizationId);
    }
  };

  // Change Ministry
  const handleOrganizationChange = async (e) => {
    const orgId = e.target.value;

    setOrganizationId(orgId);

    if (fiscalYearId && orgId) {
      await loadBudgetData(fiscalYearId, orgId);
    }
  };

  // Open Create Form
  const openCreateForm = () => {
    if (!selectedCategory) return;

    if (availableSources.length === 0) {
      setError("Both ADP and BLOCK sources already exist.");
      return;
    }

    if (remainingAmount <= 0) {
      setError(
        "No unallocated amount is available in this category."
      );
      return;
    }

    setEditingSource(null);

    setForm({
      sourceCode: availableSources[0],
      amount: "",
      remarks: "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // Open Edit Form
  const openEditForm = (source) => {
    setEditingSource(source);

    setForm({
      sourceCode: source.sourceCode,
      amount: String(source.amount),
      remarks: source.remarks || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // Close Form
  const closeForm = () => {
    setShowForm(false);
    setEditingSource(null);
  };

  // Handle Form Changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Create or Update Source
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCategory) return;

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter an amount greater than zero.");
      return;
    }

    if (!editingSource && sourceExists(form.sourceCode)) {
      setError(
        "This source already exists in the selected category."
      );
      return;
    }

    // Exclude current source when editing
    const otherSourcesTotal = sources
      .filter(
        (source) => source.id !== editingSource?.id
      )
      .reduce(
        (total, source) =>
          total + Number(source.amount || 0),
        0
      );

    // Important Category Budget validation
    if (otherSourcesTotal + amount > categoryAmount) {
      setError(
        `Source allocation cannot exceed ${formatAmount(categoryAmount)} BDT category budget. Available amount: ${formatAmount(
          categoryAmount - otherSourcesTotal
        )} BDT.`
      );
      return;
    }

    const request = {
      sourceCode: form.sourceCode,
      amount,
      remarks: form.remarks,
    };

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingSource) {
        await api.put(
          `/budget-categories/${selectedCategory.id}/sources/${editingSource.id}`,
          request
        );

        setSuccess("Budget source updated successfully.");
      } else {
        await api.post(
          `/budget-categories/${selectedCategory.id}/sources`,
          request
        );

        setSuccess("Budget source created successfully.");
      }

      closeForm();

      await loadSources(selectedCategory.id);
    } catch (err) {
      console.error("Source save error:", err);

      const message =
        typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.message;

      setError(
        message || "Failed to save budget source."
      );
    } finally {
      setSaving(false);
    }
  };

  // Refresh
  const handleRefresh = async () => {
    if (fiscalYearId && organizationId) {
      await loadBudgetData(fiscalYearId, organizationId);
    } else {
      await initializePage();
    }
  };

  if (initialLoading) {
    return (
      <div className="page-container">
        Loading Fiscal Years and Ministry information...
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Budget Source Management</h1>
          <p>
            Manage ADP and Block allocations under budget categories.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
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

      {/* Fiscal Year and Ministry Selection */}
      <section className="budget-section">
        <div className="section-heading">
          <div>
            <h2>Budget Selection</h2>
            <p>
              Select Fiscal Year and Ministry
            </p>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>
              <CalendarDays size={15} />
              Fiscal Year
            </label>

            <select
              value={fiscalYearId}
              onChange={handleFiscalYearChange}
              disabled={loading}
            >
              <option value="">Select Fiscal Year</option>

              {fiscalYears.map((year) => (
                <option
                  key={year.id}
                  value={year.id}
                >
                  {year.name}
                  {year.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <Building2 size={15} />
              Ministry / Organization
            </label>

            <select
              value={organizationId}
              onChange={handleOrganizationChange}
              disabled={loading}
            >
              <option value="">Select Ministry</option>

              {organizations.map((org) => (
                <option
                  key={org.id}
                  value={org.id}
                >
                  {org.nameBn || org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="loading-state">
          Loading budget information...
        </div>
      )}

      {/* No Ministry Budget */}
      {!loading && budgetNotFound && (
        <section className="budget-section empty-state">
          <Wallet size={32} />

          <h2>Ministry Budget Not Found</h2>

          <p>
            No Ministry Budget has been created for{" "}
            {selectedFiscalYear?.name}.
          </p>

          <p>
            Please create the Ministry Budget first from the Ministry
            Budget page. After that, you can allocate ADP and BLOCK
            under the respective categories.
          </p>
        </section>
      )}

      {/* Budget Content */}
      {!loading && budget && (
        <>
          {/* Ministry Budget Summary */}
          <div className="budget-summary-card">
            <div>
              <span className="summary-label">
                Ministry Total Budget
              </span>

              <h2>
                ৳ {formatAmount(budget.totalAmount)}
              </h2>

              <small>
                {selectedMinistry?.nameBn ||
                  selectedMinistry?.name}
              </small>
            </div>

            <div>
              <span className="summary-label">
                Fiscal Year
              </span>

              <h3>
                {selectedFiscalYear?.name || budget.fiscalYearId}
              </h3>
            </div>
          </div>

          {/* Category Selector */}
          <section className="budget-section">
            <div className="section-heading">
              <div>
                <h2>Select Budget Category</h2>
                <p>
                  Choose a category to manage its budget sources.
                </p>
              </div>
            </div>

            <div className="category-selector">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-tab ${
                    selectedCategory?.id === category.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowForm(false);
                    setError("");
                    setSuccess("");
                  }}
                  disabled={loading}
                >
                  {CATEGORY_NAMES[category.categoryCode] ||
                    category.categoryName}
                </button>
              ))}
            </div>
          </section>

          {/* Category Details */}
          {selectedCategory && (
            <>
              {/* Category Summary */}
              <div className="source-summary-grid">
                <div className="summary-card">
                  <span>Category Budget</span>
                  <h3>
                    ৳ {formatAmount(categoryAmount)}
                  </h3>
                </div>

                <div className="summary-card">
                  <span>Source Allocated</span>
                  <h3>
                    ৳ {formatAmount(sourceTotal)}
                  </h3>
                </div>

                <div className="summary-card">
                  <span>Unallocated Amount</span>
                  <h3>
                    ৳ {formatAmount(remainingAmount)}
                  </h3>
                </div>
              </div>

              {/* Source Table */}
              <section className="budget-section">
                <div className="section-heading">
                  <div>
                    <h2>
                      {CATEGORY_NAMES[
                        selectedCategory.categoryCode
                      ] || selectedCategory.categoryName}{" "}
                      Sources
                    </h2>

                    <p>
                      Manage the allocation sources for this category.
                    </p>
                  </div>

                  {!isSedp && (
                    <button
                      className="primary-button"
                      onClick={openCreateForm}
                      disabled={
                        loading ||
                        saving ||
                        availableSources.length === 0 ||
                        remainingAmount <= 0
                      }
                    >
                      <Plus size={16} />
                      Add Source
                    </button>
                  )}
                </div>

                {isSedp ? (
                  <div className="empty-state">
                    SEDP does not have separate ADP or BLOCK sources.
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Source Code</th>
                          <th>Amount</th>
                          <th>Remarks</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {sources.length === 0 ? (
                          <tr>
                            <td
                              colSpan="4"
                              className="empty-cell"
                            >
                              No budget sources found.
                            </td>
                          </tr>
                        ) : (
                          sources.map((source) => (
                            <tr key={source.id}>
                              <td>
                                <span className="source-badge">
                                  {source.sourceCode}
                                </span>
                              </td>

                              <td className="amount-cell">
                                ৳ {formatAmount(source.amount)}
                              </td>

                              <td>
                                {source.remarks || "-"}
                              </td>

                              <td>
                                <button
                                  className="edit-button"
                                  onClick={() =>
                                    openEditForm(source)
                                  }
                                  disabled={saving}
                                >
                                  <Pencil size={14} />
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Create / Edit Source Form */}
              {showForm && (
                <section className="budget-section form-section">
                  <div className="section-heading">
                    <div>
                      <h2>
                        <Layers size={18} />
                        {editingSource
                          ? "Edit Source"
                          : "Add New Source"}
                      </h2>

                      <p>
                        Category:{" "}
                        {CATEGORY_NAMES[
                          selectedCategory.categoryCode
                        ] || selectedCategory.categoryName}
                      </p>
                    </div>

                    <button
                      className="secondary-button"
                      onClick={closeForm}
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>

                  <div className="form-hint">
                    Category Budget: ৳ {formatAmount(categoryAmount)}
                    <br />
                    Already Allocated: ৳ {formatAmount(
                      sources
                        .filter(
                          (source) =>
                            source.id !== editingSource?.id
                        )
                        .reduce(
                          (sum, source) =>
                            sum + Number(source.amount || 0),
                          0
                        )
                    )}
                    <br />
                    Maximum Available: ৳ {formatAmount(
                      categoryAmount -
                      sources
                        .filter(
                          (source) =>
                            source.id !== editingSource?.id
                        )
                        .reduce(
                          (sum, source) =>
                            sum + Number(source.amount || 0),
                          0
                        )
                    )}
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Source Code</label>

                        <select
                          name="sourceCode"
                          value={form.sourceCode}
                          onChange={handleChange}
                          disabled={Boolean(editingSource)}
                          required
                        >
                          {SOURCE_CODES.map((code) => (
                            <option
                              key={code}
                              value={code}
                            >
                              {code}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Allocation Amount (BDT)</label>

                        <input
                          type="number"
                          name="amount"
                          value={form.amount}
                          onChange={handleChange}
                          min="0.01"
                          step="0.01"
                          max={categoryAmount}
                          placeholder="Enter amount"
                          required
                        />
                      </div>

                      <div className="form-group full-width">
                        <label>Remarks</label>

                        <textarea
                          name="remarks"
                          value={form.remarks}
                          onChange={handleChange}
                          rows="3"
                          placeholder="Enter remarks"
                        />
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
                        <Save size={16} />

                        {saving
                          ? "Saving..."
                          : editingSource
                          ? "Update Source"
                          : "Create Source"}
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
