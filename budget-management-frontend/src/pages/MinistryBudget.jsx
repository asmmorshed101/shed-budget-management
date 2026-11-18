
import { useEffect, useState } from "react";
import {
  Wallet,
  Save,
  X,
  Layers,
  Pencil,
  RefreshCw,
  Building2,
  CalendarDays,
} from "lucide-react";

import api from "../api/axios";

// Fixed categories
const categoryOptions = [
  {
    code: "OPERATIONAL",
    name: "পরিচালন বাজেট",
  },
  {
    code: "SEDP",
    name: "এসইডিপি",
  },
  {
    code: "DEVELOPMENT",
    name: "উন্নয়ন বাজেট",
  },
];

// Currency formatter
const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function MinistryBudget() {
  // Dropdown data
  const [fiscalYears, setFiscalYears] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  // Selected values
  const [fiscalYearId, setFiscalYearId] = useState("");
  const [organizationId, setOrganizationId] = useState("");

  // Budget data
  const [budget, setBudget] = useState(null);
  const [categories, setCategories] = useState([]);

  // Loading and messages
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Forms
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [editingBudget, setEditingBudget] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [budgetForm, setBudgetForm] = useState({
    totalAmount: "",
    remarks: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    totalAmount: "",
    remarks: "",
  });

  // Load budget and categories for selected year and ministry
  const loadBudget = async (yearId, orgId) => {
    if (!yearId || !orgId) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const budgetResponse = await api.get(
        "/ministry-budgets/by-fiscal-year",
        {
          params: {
            fiscalYearId: yearId,
            organizationId: orgId,
          },
        }
      );

      const savedBudget = budgetResponse.data;

      setBudget(savedBudget);

      setBudgetForm({
        totalAmount: savedBudget.totalAmount,
        remarks: savedBudget.remarks || "",
      });

      // Load categories
      const categoryResponse = await api.get(
        `/ministry-budgets/${savedBudget.id}/categories`
      );

      setCategories(categoryResponse.data || []);
    
} catch (err) {
  console.error(
    "Budget loading error:",
    err.config?.url,
    err.response?.status,
    err.response?.data
  );

  setBudget(null);
  setCategories([]);

  setBudgetForm({
    totalAmount: "",
    remarks: "",
  });

  const message =
    err.response?.data?.message || "";

  // No budget for this fiscal year is a normal condition
  if (
    err.response?.status === 404 ||
    message.toLowerCase().includes("ministry budget not found")
  ) {
    setError("");
  } else {
    setError(
      message ||
      `Unable to load budget (${err.response?.status || "Network Error"}).`
    );
  }
} finally {
  setLoading(false);
}

  };

  // Load Fiscal Years and Organizations
  const loadInitialData = async () => {
    setInitialLoading(true);
    setError("");

    try {
      const [yearResponse, organizationResponse] =
        await Promise.all([
          api.get("/fiscal-years"),
          api.get("/organizations"),
        ]);

      const years = yearResponse.data || [];
      const allOrganizations = organizationResponse.data || [];

      setFiscalYears(years);

      // Only active Ministry organizations
      const ministries = allOrganizations.filter(
        (org) =>
          org.organizationType?.code === "MINISTRY" &&
          org.isActive === true
      );

      setOrganizations(ministries);

      // Select active fiscal year first
      const activeYear = years.find(
        (year) => year.isActive === true
      );

      const selectedYear = activeYear || years[0];

      // Select SHED ministry by code, otherwise first ministry
      const selectedOrganization =
        ministries.find((org) => org.code === "SHED") ||
        ministries[0];

      if (selectedYear) {
        setFiscalYearId(String(selectedYear.id));
      }

      if (selectedOrganization) {
        setOrganizationId(selectedOrganization.id);
      }

      if (selectedYear && selectedOrganization) {
        await loadBudget(
          selectedYear.id,
          selectedOrganization.id
        );
      }
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

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  // Change Fiscal Year
  const handleFiscalYearChange = async (e) => {
    const yearId = e.target.value;

    setFiscalYearId(yearId);

    if (yearId && organizationId) {
      await loadBudget(yearId, organizationId);
    }
  };

  // Change Ministry
  const handleOrganizationChange = async (e) => {
    const orgId = e.target.value;

    setOrganizationId(orgId);

    if (fiscalYearId && orgId) {
      await loadBudget(fiscalYearId, orgId);
    }
  };

  // Calculate totals
  const categoryTotal = categories.reduce(
    (sum, item) =>
      sum + Number(item.totalAmount || 0),
    0
  );

  const ministryTotal = Number(budget?.totalAmount || 0);

  const remaining = ministryTotal - categoryTotal;

  const allocationPercentage =
    ministryTotal > 0
      ? Math.min((categoryTotal / ministryTotal) * 100, 100)
      : 0;

  // Create or update Ministry Budget
  const saveBudget = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const amount = Number(budgetForm.totalAmount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid Ministry Budget amount.");
      }

      const payload = {
        fiscalYearId: Number(fiscalYearId),
        organizationId,
        totalAmount: amount,
        remarks: budgetForm.remarks,
      };

      if (editingBudget && budget?.id) {
        await api.put(
          `/ministry-budgets/${budget.id}`,
          payload
        );

        setSuccess("Ministry Budget updated successfully.");
      } else {
        await api.post(
          "/ministry-budgets",
          payload
        );

        setSuccess("Ministry Budget created successfully.");
      }

      setShowBudgetForm(false);
      setEditingBudget(false);

      await loadBudget(fiscalYearId, organizationId);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to save Ministry Budget."
      );
    } finally {
      setLoading(false);
    }
  };

  // Open Ministry Budget form
  const openBudgetForm = () => {
    setBudgetForm({
      totalAmount: budget?.totalAmount || "",
      remarks: budget?.remarks || "",
    });

    setEditingBudget(Boolean(budget));
    setShowBudgetForm(true);
  };

  // Open Category edit form
  const openCategoryEdit = (category) => {
    setEditingCategoryId(category.id);

    setCategoryForm({
      totalAmount: category.totalAmount,
      remarks: category.remarks || "",
    });

    setShowCategoryForm(true);
  };

  // Update Category
  const saveCategory = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const amount = Number(categoryForm.totalAmount);

      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Enter a valid category amount.");
      }

      const otherCategoryTotal = categories
        .filter((item) => item.id !== editingCategoryId)
        .reduce(
          (sum, item) =>
            sum + Number(item.totalAmount || 0),
          0
        );

      if (otherCategoryTotal + amount > ministryTotal) {
        throw new Error(
          "Category allocation cannot exceed Ministry Budget."
        );
      }

      const category = categories.find(
        (item) => item.id === editingCategoryId
      );

      if (!category) {
        throw new Error("Category not found.");
      }

      const payload = {
        categoryCode: category.categoryCode,
        totalAmount: amount,
        remarks: categoryForm.remarks,
      };

      await api.put(
        `/budget-categories/${editingCategoryId}`,
        payload
      );

      setSuccess(
        `${category.categoryName} updated successfully.`
      );

      setShowCategoryForm(false);
      setEditingCategoryId(null);

      await loadBudget(fiscalYearId, organizationId);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to update Category."
      );
    } finally {
      setLoading(false);
    }
  };

  // Refresh
  const handleRefresh = async () => {
    if (fiscalYearId && organizationId) {
      await loadBudget(fiscalYearId, organizationId);
    } else {
      await loadInitialData();
    }
  };

  // Get selected Ministry
  const selectedMinistry = organizations.find(
    (org) => org.id === organizationId
  );

  const selectedFiscalYear = fiscalYears.find(
    (year) => String(year.id) === String(fiscalYearId)
  );

  // Render
  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Ministry Budget Distribution</h1>
          <p>
            Manage Ministry Budget by Fiscal Year and Category
          </p>
        </div>

        <div className="filter-actions">
          <button
            className="secondary-button"
            onClick={handleRefresh}
            disabled={loading || initialLoading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          {budget && (
            <button
              className="primary-button"
              onClick={openBudgetForm}
            >
              <Pencil size={16} />
              Edit Ministry Budget
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {/* Initial Loading */}
      {initialLoading && (
        <div className="loading-state">
          Loading Fiscal Years and Ministries...
        </div>
      )}

      {!initialLoading && (
        <>
          {/* Fiscal Year and Ministry Selection */}
          <section className="content-card">
            <div className="card-heading">
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
                  <option value="">
                    Select Fiscal Year
                  </option>

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
                  <option value="">
                    Select Ministry
                  </option>

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

            {selectedFiscalYear && selectedMinistry && (
              <div className="form-hint">
                Selected: {selectedFiscalYear.name} —{" "}
                {selectedMinistry.nameBn || selectedMinistry.name}
              </div>
            )}
          </section>

          {/* Loading Budget */}
          {loading && (
            <div className="loading-state">
              Loading Budget Information...
            </div>
          )}

          {/* No Budget */}
          {!loading && !budget && !error &&
            fiscalYearId && organizationId && (
              <section className="content-card">
                <div className="empty-state">
                  <Wallet size={35} />

                  <h2>No Ministry Budget Found</h2>

                  <p>
                    No budget has been created for{" "}
                    {selectedFiscalYear?.name}.
                  </p>

                  <button
                    className="primary-button"
                    onClick={openBudgetForm}
                  >
                    Create Ministry Budget
                  </button>
                </div>
              </section>
            )}

          {/* Budget Information */}
          {!loading && budget && (
            <>
              {/* Total Ministry Budget */}
              <section className="budget-overview content-card">
                <div className="budget-overview-icon">
                  <Wallet size={25} />
                </div>

                <div className="budget-overview-info">
                  <span>Total Ministry Budget</span>

                  <h2>{money(budget.totalAmount)}</h2>

                  <small>
                    <Building2 size={13} />
                    {selectedMinistry?.nameBn ||
                      selectedMinistry?.name}
                  </small>

                  <small>
                    <CalendarDays size={13} />
                    Fiscal Year: {selectedFiscalYear?.name}
                  </small>
                </div>
              </section>

              {/* Category Heading */}
              <div className="page-heading category-heading">
                <div>
                  <h2>Budget Categories</h2>
                  <p>
                    Distribute Ministry Budget among three fixed categories
                  </p>
                </div>
              </div>

              {/* Summary */}
              <section className="content-card">
                <div className="category-summary">
                  <div>
                    <span>Ministry Budget</span>
                    <strong>{money(ministryTotal)}</strong>
                  </div>

                  <div>
                    <span>Category Allocation</span>
                    <strong>{money(categoryTotal)}</strong>
                  </div>

                  <div>
                    <span>Unallocated Budget</span>
                    <strong
                      className={
                        remaining < 0 ? "negative-value" : ""
                      }
                    >
                      {money(remaining)}
                    </strong>
                  </div>
                </div>

                {/* Allocation Progress */}
                <div className="allocation-progress">
                  <div className="progress-heading">
                    <span>Budget Distribution</span>
                    <strong>
                      {allocationPercentage.toFixed(2)}%
                    </strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${allocationPercentage}%`,
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Category Table */}
              <section className="content-card">
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Category Name</th>
                        <th>Category Code</th>
                        <th>Budget Amount</th>
                        <th>Percentage</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {categoryOptions.map((option) => {
                        const category = categories.find(
                          (item) =>
                            item.categoryCode === option.code
                        );

                        const amount = Number(
                          category?.totalAmount || 0
                        );

                        const percentage =
                          ministryTotal > 0
                            ? (amount / ministryTotal) * 100
                            : 0;

                        return (
                          <tr key={option.code}>
                            <td>
                              {option.name}
                            </td>

                            <td>
                              {option.code}
                            </td>

                            <td>
                              <strong>{money(amount)}</strong>
                            </td>

                            <td>
                              {percentage.toFixed(2)}%
                            </td>

                            <td>
                              {category ? (
                                <button
                                  className="table-action"
                                  onClick={() =>
                                    openCategoryEdit(category)
                                  }
                                  disabled={loading}
                                >
                                  <Pencil size={15} />
                                  Edit
                                </button>
                              ) : (
                                <span>
                                  Not created
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Category Edit Form */}
              {showCategoryForm && (
                <section className="content-card category-form-card">
                  <div className="card-heading form-heading">
                    <div>
                      <h2>
                        <Layers size={18} />
                        Edit Budget Category
                      </h2>

                      <p>
                        {categoryOptions.find(
                          (item) =>
                            item.code ===
                            categories.find(
                              (cat) =>
                                cat.id === editingCategoryId
                            )?.categoryCode
                        )?.name}
                      </p>
                    </div>

                    <button
                      className="icon-button"
                      onClick={() =>
                        setShowCategoryForm(false)
                      }
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={saveCategory}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Category Budget (BDT)</label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={categoryForm.totalAmount}
                          onChange={(e) =>
                            setCategoryForm({
                              ...categoryForm,
                              totalAmount: e.target.value,
                            })
                          }
                          placeholder="Enter category amount"
                        />
                      </div>

                      <div className="form-group">
                        <label>Remarks</label>

                        <input
                          value={categoryForm.remarks}
                          onChange={(e) =>
                            setCategoryForm({
                              ...categoryForm,
                              remarks: e.target.value,
                            })
                          }
                          placeholder="Optional remarks"
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setShowCategoryForm(false)
                        }
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="primary-button"
                        disabled={loading}
                      >
                        <Save size={16} />
                        {loading ? "Saving..." : "Save Category"}
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* Ministry Budget Create/Edit Form */}
      {showBudgetForm && (
        <section className="content-card form-card">
          <div className="card-heading form-heading">
            <div>
              <h2>
                {editingBudget
                  ? "Edit Ministry Budget"
                  : "Create Ministry Budget"}
              </h2>

              <p>
                {selectedFiscalYear?.name} —{" "}
                {selectedMinistry?.nameBn ||
                  selectedMinistry?.name}
              </p>
            </div>

            <button
              className="icon-button"
              onClick={() => setShowBudgetForm(false)}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={saveBudget}>
            <div className="form-grid">
              <div className="form-group">
                <label>Fiscal Year</label>
                <input
                  value={selectedFiscalYear?.name || ""}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Ministry</label>
                <input
                  value={
                    selectedMinistry?.nameBn ||
                    selectedMinistry?.name ||
                    ""
                  }
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Total Ministry Budget (BDT) *</label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={budgetForm.totalAmount}
                  onChange={(e) =>
                    setBudgetForm({
                      ...budgetForm,
                      totalAmount: e.target.value,
                    })
                  }
                  placeholder="Enter total budget"
                />
              </div>

              <div className="form-group">
                <label>Remarks</label>

                <input
                  value={budgetForm.remarks}
                  onChange={(e) =>
                    setBudgetForm({
                      ...budgetForm,
                      remarks: e.target.value,
                    })
                  }
                  placeholder="Optional remarks"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowBudgetForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                <Save size={16} />
                {loading ? "Saving..." : "Save Budget"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
