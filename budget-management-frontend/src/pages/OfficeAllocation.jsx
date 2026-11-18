
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Building2,
  Wallet,
  RefreshCw,
  Plus,
  Pencil,
  Save,
  X,
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

export default function OfficeAllocation() {
  // Fiscal Year and Organization
  const [fiscalYears, setFiscalYears] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  const [fiscalYearId, setFiscalYearId] = useState("");
  const [organizationId, setOrganizationId] = useState("");

  // Budget information
  const [budget, setBudget] = useState(null);
  const [categories, setCategories] = useState([]);

  // Source and allocation information
  const [sources, setSources] = useState([]);
  const [allocations, setAllocations] = useState([]);

  // Selected items
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Loading and messages
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [budgetNotFound, setBudgetNotFound] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [formSourceAllocations, setFormSourceAllocations] = useState({});
  const [formSourceLoading, setFormSourceLoading] = useState(false);

  const [form, setForm] = useState({
    organizationId: "",
    adpAmount: "0",
    blockAmount: "0",
    remarks: "",
  });

  // --------------------------------------------------
  // INITIAL LOAD: Fiscal Years and Organization Hierarchy
  // --------------------------------------------------

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError("");

      const [{ activeFiscalYear: activeYear, fiscalYears: years, ministry }, organizationResponse] =
        await Promise.all([
          loadActiveMinistryContext(),
          api.get("/organizations/hierarchy"),
        ]);

      const orgs = Array.isArray(organizationResponse.data)
        ? organizationResponse.data
        : [];

      setFiscalYears(years);
      setOrganizations(orgs);

      const defaultYear = activeYear;

      if (!defaultYear) {
        setError("No Fiscal Year found.");
        return;
      }

      setFiscalYearId(String(defaultYear.id));
      setOrganizationId(ministry.id);

      await loadBudgetData(
        defaultYear.id,
        ministry.id
      );

    } catch (err) {
      console.error("Initial loading error:", err);

      setError(
        err.response?.data?.message ||
        "Failed to load Fiscal Year or Organization information."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // LOAD MINISTRY BUDGET AND CATEGORIES
  // --------------------------------------------------

  const loadBudgetData = async (yearId, orgId) => {
    if (!yearId || !orgId) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Reset previous year data
      setBudget(null);
      setCategories([]);
      setSources([]);
      setAllocations([]);

      setSelectedCategory(null);


      setShowForm(false);
      setEditingAllocation(null);

      setBudgetNotFound(false);

      // Load Ministry Budget
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

      // Load Budget Categories
      const categoryResponse = await api.get(
        `/ministry-budgets/${budgetData.id}/categories`
      );

      const categoryData = Array.isArray(categoryResponse.data)
        ? categoryResponse.data
        : [];

      setCategories(categoryData);

      if (categoryData.length > 0) {
        setSelectedCategory(categoryData[0]);
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
      setSources([]);
      setAllocations([]);

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

  // --------------------------------------------------
  // CHANGE FISCAL YEAR
  // --------------------------------------------------

  const handleFiscalYearChange = async (e) => {
    const yearId = e.target.value;

    setFiscalYearId(yearId);

    if (yearId && organizationId) {
      await loadBudgetData(
        yearId,
        organizationId
      );
    }
  };

  // --------------------------------------------------
  // ORGANIZATION HIERARCHY
  // --------------------------------------------------

  const offices = useMemo(() => {
    const activeOrganizations = organizations.filter(
      (org) => org.isActive !== false
    );

    const result = [];

    const visited = new Set([organizationId]);

    const findChildren = (parentId, level = 0) => {
      const children = activeOrganizations.filter(
        (org) => (org.parentId || org.parent?.id) === parentId
      );

      children.forEach((child) => {
        if (visited.has(child.id)) return;

        visited.add(child.id);

        result.push({
          ...child,
          level,
        });

        findChildren(
          child.id,
          level + 1
        );
      });
    };

    if (organizationId) {
      findChildren(organizationId);
    }

    return result;
  }, [organizations, organizationId]);

  // --------------------------------------------------
  // LOAD ALL SOURCES AND OFFICE ALLOCATIONS WHEN CATEGORY CHANGES
  // --------------------------------------------------

  useEffect(() => {
    if (selectedCategory?.id) {
      loadSources(selectedCategory.id);
    } else {
      setSources([]);
      setAllocations([]);
      setFormSourceAllocations({});
    }
  }, [selectedCategory]);

  const loadSources = async (categoryId) => {
    try {
      setError("");
      setSources([]);
      setAllocations([]);

      const response = await api.get(
        `/budget-categories/${categoryId}/sources`
      );

      const data = Array.isArray(response.data) ? response.data : [];
      setSources(data);

      const allocationMap = await loadAllSourceAllocations(data);
      setAllocations(mergeOfficeAllocations(data, allocationMap));
    } catch (err) {
      console.error("Source loading error:", err);
      setSources([]);
      setAllocations([]);
      setError(
        err.response?.data?.message ||
        "Failed to load budget sources and office allocations."
      );
    }
  };

  // --------------------------------------------------
  // --------------------------------------------------
  // ADP / BLOCK BUDGET SUMMARY
  // --------------------------------------------------

  const adpSource = sources.find(
    (source) =>
      String(source.sourceCode || source.code || "").trim().toUpperCase() === "ADP"
  );

  const blockSource = sources.find(
    (source) =>
      String(source.sourceCode || source.code || "").trim().toUpperCase() === "BLOCK"
  );

  const adpAllocations = adpSource
    ? (formSourceAllocations[String(adpSource.id)] || [])
    : [];

  const blockAllocations = blockSource
    ? (formSourceAllocations[String(blockSource.id)] || [])
    : [];

  const adpAllocatedTotal = adpAllocations.reduce(
    (total, item) => total + Number(item.allocatedAmount || 0),
    0
  );

  const blockAllocatedTotal = blockAllocations.reduce(
    (total, item) => total + Number(item.allocatedAmount || 0),
    0
  );

  const adpBudget = Number(adpSource?.amount || 0);
  const blockBudget = Number(blockSource?.amount || 0);
  const adpRemaining = adpBudget - adpAllocatedTotal;
  const blockRemaining = blockBudget - blockAllocatedTotal;

  // Organization lookup
  const organizationMap = useMemo(() => {
    return new Map(
      organizations.map((org) => [
        org.id,
        org,
      ])
    );
  }, [organizations]);

  const getOfficeName = (id) => {
    const office = organizationMap.get(id);

    return office?.nameBn ||
      office?.name ||
      id;
  };

  // --------------------------------------------------
  // LOAD ADP AND BLOCK OFFICE ALLOCATIONS
  // --------------------------------------------------

  const loadAllSourceAllocations = async (sourceList = sources) => {
    if (!sourceList.length) {
      setFormSourceAllocations({});
      return {};
    }

    setFormSourceLoading(true);

    try {
      const results = await Promise.all(
        sourceList.map(async (source) => {
          const response = await api.get(
            `/budget-sources/${source.id}/offices`
          );

          return [
            String(source.id),
            Array.isArray(response.data) ? response.data : [],
          ];
        })
      );

      const allocationMap = Object.fromEntries(results);
      setFormSourceAllocations(allocationMap);
      return allocationMap;
    } catch (err) {
      console.error("Source allocations loading error:", err);
      setError(
        err.response?.data?.message ||
        "Could not load existing ADP/BLOCK office allocations."
      );
      return {};
    } finally {
      setFormSourceLoading(false);
    }
  };

  const getSourceByCode = (code) =>
    sources.find(
      (source) =>
        String(source.sourceCode || source.code || "").trim().toUpperCase() === code
    );

  const mergeOfficeAllocations = (sourceList, allocationMap) => {
    const officeMap = new Map();

    // Only offices with a positive ADP or BLOCK allocation are displayed.
    // Offices with no allocation remain available in the Add/Edit form dropdown.

    sourceList.forEach((source) => {
      const code = String(source.sourceCode || source.code || "")
        .trim()
        .toUpperCase();

      (allocationMap[String(source.id)] || []).forEach((item) => {
        const officeId = item.organizationId;
        if (!officeMap.has(officeId)) {
          officeMap.set(officeId, {
            organizationId: officeId,
            adpAmount: 0,
            blockAmount: 0,
            adpAllocationId: null,
            blockAllocationId: null,
            remarks: item.remarks || "",
          });
        }

        const row = officeMap.get(officeId);
        if (code === "ADP") {
          row.adpAmount = Number(item.allocatedAmount || 0);
          row.adpAllocationId = item.id;
        } else if (code === "BLOCK") {
          row.blockAmount = Number(item.allocatedAmount || 0);
          row.blockAllocationId = item.id;
        }

        if (item.remarks) row.remarks = item.remarks;
      });
    });

    return Array.from(officeMap.values())
      // Hide offices where both source amounts are zero.
      .filter(
        (row) =>
          Number(row.adpAmount || 0) > 0 ||
          Number(row.blockAmount || 0) > 0
      )
      .sort((a, b) =>
        getOfficeName(a.organizationId).localeCompare(
          getOfficeName(b.organizationId),
          "bn"
        )
      );
  };

  const populateOfficeAmounts = (officeId, allocationMap) => {
    const adp = getSourceByCode("ADP");
    const block = getSourceByCode("BLOCK");

    const adpRecord = adp
      ? (allocationMap[String(adp.id)] || []).find(
          (item) => item.organizationId === officeId
        )
      : null;

    const blockRecord = block
      ? (allocationMap[String(block.id)] || []).find(
          (item) => item.organizationId === officeId
        )
      : null;

    setForm((previous) => ({
      ...previous,
      organizationId: officeId,
      adpAmount: adpRecord ? String(adpRecord.allocatedAmount) : "0",
      blockAmount: blockRecord ? String(blockRecord.allocatedAmount) : "0",
      remarks: adpRecord?.remarks || blockRecord?.remarks || previous.remarks,
    }));
  };

  // --------------------------------------------------
  // OPEN CREATE FORM
  // --------------------------------------------------

  const openCreateForm = async () => {
    if (!sources.length) {
      setError("Please add ADP or BLOCK source first.");
      return;
    }

    setEditingAllocation(null);
    setForm({
      organizationId: "",
      adpAmount: "0",
      blockAmount: "0",
      remarks: "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
    await loadAllSourceAllocations();
  };

  // --------------------------------------------------
  // OPEN EDIT FORM: edit both source amounts for one office
  // --------------------------------------------------

  const openEditForm = async (allocation) => {
    setEditingAllocation(allocation);
    setForm({
      organizationId: allocation.organizationId,
      adpAmount: "0",
      blockAmount: "0",
      remarks: allocation.remarks || "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);

    const allocationMap = await loadAllSourceAllocations();
    populateOfficeAmounts(allocation.organizationId, allocationMap);
  };

  // --------------------------------------------------
  // CLOSE FORM
  // --------------------------------------------------

  const closeForm = () => {
    setShowForm(false);
    setEditingAllocation(null);
    setFormSourceAllocations({});
  };

  // --------------------------------------------------
  // FORM CHANGE
  // --------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "organizationId") {
      populateOfficeAmounts(value, formSourceAllocations);
      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // SAVE ADP AND BLOCK ALLOCATIONS FOR THE SELECTED OFFICE
  // --------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.organizationId) {
      setError("Please select an office.");
      return;
    }

    const adpSource = getSourceByCode("ADP");
    const blockSource = getSourceByCode("BLOCK");

    if (!adpSource && !blockSource) {
      setError("ADP or BLOCK source was not found for this category.");
      return;
    }

    const entries = [
      { code: "ADP", source: adpSource, rawAmount: form.adpAmount },
      { code: "BLOCK", source: blockSource, rawAmount: form.blockAmount },
    ];

    const amounts = entries.map((entry) => ({
      ...entry,
      amount: Number(entry.rawAmount || 0),
    }));

    for (const entry of amounts) {
      if (!Number.isFinite(entry.amount) || entry.amount < 0) {
        setError(`${entry.code} amount must be zero or a positive number.`);
        return;
      }
      if (entry.amount > 0 && !entry.source) {
        setError(`${entry.code} source does not exist for this category.`);
        return;
      }
    }

    if (amounts.every((entry) => entry.amount === 0)) {
      setError("Enter an ADP amount or BLOCK amount. Both cannot be zero.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Always fetch current allocations before validating the limits.
      const latestMap = {};
      for (const entry of amounts) {
        if (!entry.source) continue;
        const response = await api.get(
          `/budget-sources/${entry.source.id}/offices`
        );
        latestMap[String(entry.source.id)] = Array.isArray(response.data)
          ? response.data
          : [];
      }

      // Validate each source independently and prepare create/update actions.
      const actions = [];
      const zeroExistingSources = [];
      for (const entry of amounts) {
        if (!entry.source) continue;

        const sourceAllocations = latestMap[String(entry.source.id)] || [];
        const existing = sourceAllocations.find(
          (item) => item.organizationId === form.organizationId
        );
        const totalOtherOffices = sourceAllocations
          .filter((item) => item.id !== existing?.id)
          .reduce(
            (total, item) => total + Number(item.allocatedAmount || 0),
            0
          );
        const available = Number(entry.source.amount || 0) - totalOtherOffices;

        if (entry.amount > available) {
          setError(
            `${entry.code} allocation exceeds its source budget. Available amount: ${formatAmount(available)} BDT.`
          );
          return;
        }

        // A zero means no new allocation for this source. If a record already
        // exists, it is retained because the supplied API has no delete endpoint.
        if (entry.amount === 0) {
          if (existing) zeroExistingSources.push(entry.code);
          continue;
        }

        actions.push({
          source: entry.source,
          existing,
          amount: entry.amount,
        });
      }

      const requestFor = (amount) => ({
        organizationId: form.organizationId,
        allocatedAmount: amount,
        remarks: form.remarks,
      });

      // Run the API calls in order so a failed request is easier to identify.
      for (const action of actions) {
        if (action.existing) {
          await api.put(
            `/office-allocations/${action.existing.id}`,
            requestFor(action.amount)
          );
        } else {
          await api.post(
            `/budget-sources/${action.source.id}/offices`,
            requestFor(action.amount)
          );
        }
      }

      const zeroSources = amounts
        .filter((entry) => entry.amount === 0 && !zeroExistingSources.includes(entry.code))
        .map((entry) => entry.code);

      const retainedMessage = zeroExistingSources.length
        ? ` Existing ${zeroExistingSources.join(" and ")} allocation was kept; this API does not support deleting an existing allocation.`
        : "";
      const zeroMessage = zeroSources.length
        ? ` No new ${zeroSources.join(" and ")} allocation was created (amount 0).`
        : "";

      setSuccess(
        `Office allocation saved successfully.${zeroMessage}${retainedMessage}`
      );

      const officeId = form.organizationId;
      closeForm();

      // Refresh both ADP and BLOCK allocations and rebuild the combined office list.
      const refreshedMap = await loadAllSourceAllocations();
      setAllocations(mergeOfficeAllocations(sources, refreshedMap));

    } catch (err) {
      console.error("Office allocation save error:", err);
      const message =
        typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.message;
      setError(message || "Failed to save ADP/BLOCK office allocation.");
    } finally {
      setSaving(false);
    }
  };

  // REFRESH
  // --------------------------------------------------

  const handleRefresh = async () => {
    if (fiscalYearId && organizationId) {
      await loadBudgetData(
        fiscalYearId,
        organizationId
      );
    } else {
      await loadInitialData();
    }
  };

  // Selected Fiscal Year
  const selectedFiscalYear = fiscalYears.find(
    (year) =>
      String(year.id) === String(fiscalYearId)
  );

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  if (loading && !budget && !budgetNotFound) {
    return (
      <div className="page-container">
        Loading Office Allocation Information...
      </div>
    );
  }

  return (
    <div className="page-container">

      {/* PAGE HEADER */}

      <div className="page-header">
        <div>
          <h1>Office Budget Allocation</h1>

          <p>
            Distribute category budget sources among SHED offices.
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

      {/* ERROR MESSAGE */}

      {error && (
        <div className="alert alert-error">
          {String(error)}
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* FISCAL YEAR SELECTION */}

      <section className="budget-section">

        <div className="section-heading">
          <div>
            <h2>
              <CalendarDays size={18} />
              Fiscal Year Selection
            </h2>

            <p>
              Select the fiscal year for office budget allocation.
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
              Ministry
            </label>

            <input
              value="মাধ্যমিক ও উচ্চ শিক্ষা বিভাগ"
              disabled
            />
          </div>

        </div>

        {selectedFiscalYear && (
          <div className="form-hint">
            Selected Fiscal Year: {selectedFiscalYear.name}
          </div>
        )}

      </section>

      {/* LOADING */}

      {loading && (
        <div className="loading-state">
          Loading budget information...
        </div>
      )}

      {/* NO MINISTRY BUDGET */}

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
            Budget page. Then create Category and Source Allocations.
          </p>
        </section>
      )}

      {/* BUDGET CONTENT */}

      {!loading && budget && (
        <>

          {/* MINISTRY BUDGET SUMMARY */}

          <div className="budget-summary-card">

            <div>
              <span className="summary-label">
                Ministry Total Budget
              </span>

              <h2>
                ৳ {formatAmount(budget.totalAmount)}
              </h2>
            </div>

            <div>
              <span className="summary-label">
                Fiscal Year
              </span>

              <h3>
                {selectedFiscalYear?.name ||
                  budget.fiscalYearId}
              </h3>
            </div>

          </div>

          {/* CATEGORY SELECTION */}

          <section className="budget-section">

            <div className="section-heading">
              <div>
                <h2>Select Budget Category</h2>

                <p>
                  Choose a category for office allocation.
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
                >
                  <span style={{ display: "block" }}>
                    {CATEGORY_NAMES[category.categoryCode] ||
                      category.categoryName}
                  </span>
                  <small style={{ display: "block", marginTop: "4px", fontSize: "12px", fontWeight: 500 }}>
                    ৳ {formatAmount(category.totalAmount)}
                  </small>
                </button>
              ))}

            </div>

          </section>

          {/* COMBINED ADP / BLOCK ALLOCATIONS */}

      {selectedCategory && (
        <>
          {sources.length === 0 ? (
            <section className="budget-section empty-state">
              No ADP or BLOCK budget sources found for this category.
            </section>
          ) : (
            <>
              <div className="source-summary-grid">
                <div className="summary-card">
                  <span>ADP Budget</span>
                  <h3>৳ {formatAmount(adpBudget)}</h3>
                  <small>Allocated: ৳ {formatAmount(adpAllocatedTotal)}</small>
                  <small>Remaining: ৳ {formatAmount(adpRemaining)}</small>
                </div>
                <div className="summary-card">
                  <span>BLOCK Budget</span>
                  <h3>৳ {formatAmount(blockBudget)}</h3>
                  <small>Allocated: ৳ {formatAmount(blockAllocatedTotal)}</small>
                  <small>Remaining: ৳ {formatAmount(blockRemaining)}</small>
                </div>
                <div className="summary-card">
                  <span>Total Office Allocated</span>
                  <h3>৳ {formatAmount(adpAllocatedTotal + blockAllocatedTotal)}</h3>
                  <small>ADP + BLOCK</small>
                </div>
              </div>

              <section className="budget-section">
                <div className="section-heading">
                  <div>
                    <h2>
                      {CATEGORY_NAMES[selectedCategory.categoryCode] ||
                        selectedCategory.categoryName} - Office Allocations
                    </h2>
                    <p>ADP and BLOCK allocations for each office are displayed together.</p>
                  </div>
                  <button
                    className="primary-button"
                    onClick={openCreateForm}
                    disabled={saving || formSourceLoading}
                  >
                    <Plus size={16} />
                    Add Allocation
                  </button>
                </div>

                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Office</th>
                        <th>ADP Allocation</th>
                        <th>BLOCK Allocation</th>
                        <th>Total Allocation</th>
                        <th>Remarks</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="empty-cell">
                            No office allocations found.
                          </td>
                        </tr>
                      ) : (
                        allocations.map((allocation) => (
                          <tr key={allocation.organizationId}>
                            <td>{getOfficeName(allocation.organizationId)}</td>
                            <td className="amount-cell">৳ {formatAmount(allocation.adpAmount)}</td>
                            <td className="amount-cell">৳ {formatAmount(allocation.blockAmount)}</td>
                            <td className="amount-cell">
                              ৳ {formatAmount(allocation.adpAmount + allocation.blockAmount)}
                            </td>
                            <td>{allocation.remarks || "-"}</td>
                            <td>
                              <button
                                className="edit-button"
                                onClick={() => openEditForm(allocation)}
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
              </section>

              {showForm && (
                <section className="budget-section form-section">
                  <div className="section-heading">
                    <div>
                      <h2>
                        {editingAllocation
                          ? "Edit Office ADP / BLOCK Allocation"
                          : "Add Office ADP / BLOCK Allocation"}
                      </h2>
                      <p>
                        Select an office and enter ADP and BLOCK amounts together.
                        Leave either amount as 0 if no allocation is required.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={closeForm}
                      disabled={saving}
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>

                  {formSourceLoading && (
                    <div className="form-hint">
                      Loading existing ADP and BLOCK allocations...
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label>Select Office *</label>
                        <select
                          name="organizationId"
                          value={form.organizationId}
                          onChange={handleChange}
                          disabled={Boolean(editingAllocation) || formSourceLoading}
                          required
                        >
                          <option value="">Select an Office</option>
                          {offices.map((office) => (
                            <option key={office.id} value={office.id}>
                              {"— ".repeat(office.level)}
                              {office.nameBn || office.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>ADP Allocation Amount (BDT)</label>
                        <input
                          type="number"
                          name="adpAmount"
                          value={form.adpAmount}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          placeholder="Enter ADP amount or 0"
                          disabled={formSourceLoading || !form.organizationId}
                        />
                        <small>
                          ADP Budget: ৳ {formatAmount(adpBudget)} | Remaining: ৳ {formatAmount(adpRemaining)}
                        </small>
                      </div>

                      <div className="form-group">
                        <label>BLOCK Allocation Amount (BDT)</label>
                        <input
                          type="number"
                          name="blockAmount"
                          value={form.blockAmount}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          placeholder="Enter BLOCK amount or 0"
                          disabled={formSourceLoading || !form.organizationId}
                        />
                        <small>
                          BLOCK Budget: ৳ {formatAmount(blockBudget)} | Remaining: ৳ {formatAmount(blockRemaining)}
                        </small>
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

                    {form.organizationId && (
                      <div className="form-hint">
                        Existing ADP: ৳ {formatAmount(
                          (formSourceAllocations[String(getSourceByCode("ADP")?.id)] || [])
                            .find((item) => item.organizationId === form.organizationId)?.allocatedAmount
                        )}
                        <br />
                        Existing BLOCK: ৳ {formatAmount(
                          (formSourceAllocations[String(getSourceByCode("BLOCK")?.id)] || [])
                            .find((item) => item.organizationId === form.organizationId)?.allocatedAmount
                        )}
                      </div>
                    )}

                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={closeForm}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={saving || formSourceLoading}
                      >
                        <Save size={16} />
                        {saving ? "Saving..." : "Save Office Allocation"}
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </>
          )}
        </>
      )}

        </>
      )}

    </div>
  );
}
