
import { useState } from "react";
import { Wallet, Plus, Save, X, Layers } from "lucide-react";
import api from "../api/axios";

const fiscalYearId = Number(import.meta.env.VITE_FISCAL_YEAR_ID);
const organizationId = import.meta.env.VITE_SHED_ORGANIZATION_ID;

const initialCategories = [
  { categoryCode: "OPERATIONAL", categoryName: "পরিচালন বাজেট" },
  { categoryCode: "SEDP", categoryName: "এসইডিপি" },
  { categoryCode: "DEVELOPMENT", categoryName: "উন্নয়ন বাজেট" },
];

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function MinistryBudget() {
  const [budget, setBudget] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    totalAmount: "",
    remarks: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    categoryCode: "OPERATIONAL",
    totalAmount: "",
    remarks: "",
  });

  const [categories, setCategories] = useState([]);

  const handleBudgetChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCategoryChange = (e) => {
    setCategoryForm({
      ...categoryForm,
      [e.target.name]: e.target.value,
    });
  };

  const createBudget = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await api.post("/ministry-budgets", {
        fiscalYearId,
        organizationId,
        totalAmount: Number(form.totalAmount),
        remarks: form.remarks,
      });
      console.log("Budget created:", response.data);
      setBudget(response.data);
      setCategories([]);
      setShowForm(false);
      setForm({ totalAmount: "", remarks: "" });
      setSuccess("Ministry Budget successfully created.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to create Ministry Budget."
      );
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (e) => {
    e.preventDefault();

    if (!budget?.id) {
      setError("Create Ministry Budget first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const selected = initialCategories.find(
        (item) => item.categoryCode === categoryForm.categoryCode
      );

      const response = await api.post(
        `/ministry-budgets/${budget.id}/categories`,
        {
          categoryCode: categoryForm.categoryCode,
          totalAmount: Number(categoryForm.totalAmount),
          remarks: categoryForm.remarks,
        }
      );

      setCategories((previous) => [...previous, {
        ...response.data,
        categoryName: selected?.categoryName,
      }]);

      setCategoryForm({
        categoryCode: "OPERATIONAL",
        totalAmount: "",
        remarks: "",
      });

      setSuccess("Budget category successfully added.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to add budget category."
      );
    } finally {
      setLoading(false);
    }
  };

  const categoryTotal = categories.reduce(
    (sum, item) => sum + Number(item.totalAmount || 0),
    0
  );

  const remaining = Number(budget?.totalAmount || 0) - categoryTotal;

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Ministry Budget</h1>
          <p>Manage annual budget of Secondary and Higher Education Division</p>
        </div>

        {!budget && (
          <button
            className="primary-button"
            onClick={() => setShowForm(true)}
          >
            <Plus size={17} />
            Create Ministry Budget
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showForm && (
        <section className="content-card form-card">
          <div className="card-heading form-heading">
            <div>
              <h2>Create Ministry Budget</h2>
              <p>Enter the approved budget for the selected fiscal year</p>
            </div>
            <button
              className="icon-button"
              onClick={() => setShowForm(false)}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={createBudget}>
            <div className="form-grid">
              <div className="form-group">
                <label>Fiscal Year ID</label>
                <input value={fiscalYearId} disabled />
              </div>

              <div className="form-group">
                <label>Ministry</label>
                <input
                  value="Secondary and Higher Education Division"
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Total Ministry Budget (BDT) *</label>
                <input
                  type="number"
                  name="totalAmount"
                  min="0.01"
                  step="0.01"
                  value={form.totalAmount}
                  onChange={handleBudgetChange}
                  required
                  placeholder="Enter total budget"
                />
              </div>

              <div className="form-group">
                <label>Remarks</label>
                <input
                  name="remarks"
                  value={form.remarks}
                  onChange={handleBudgetChange}
                  placeholder="Optional remarks"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowForm(false)}
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

      {budget && (
        <>
          <section className="budget-overview content-card">
            <div className="budget-overview-icon">
              <Wallet size={25} />
            </div>

            <div className="budget-overview-info">
              <span>Total Ministry Budget</span>
              <h2>{money(budget.totalAmount)}</h2>
              <small>Fiscal Year ID: {fiscalYearId}</small>
            </div>
          </section>

          <div className="page-heading category-heading">
            <div>
              <h2>Budget Categories</h2>
              <p>Distribute ministry budget among three categories</p>
            </div>
          </div>

          <section className="content-card">
            <div className="category-summary">
              <div>
                <span>Ministry Budget</span>
                <strong>{money(budget.totalAmount)}</strong>
              </div>
              <div>
                <span>Category Total</span>
                <strong>{money(categoryTotal)}</strong>
              </div>
              <div>
                <span>Unallocated</span>
                <strong className={remaining < 0 ? "negative-value" : ""}>
                  {money(remaining)}
                </strong>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Code</th>
                    <th>Budget Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>{item.categoryName || item.categoryCode}</td>
                      <td>{item.categoryCode}</td>
                      <td>{money(item.totalAmount)}</td>
                    </tr>
                  ))}

                  {categories.length === 0 && (
                    <tr>
                      <td colSpan="3" className="empty-table">
                        No categories added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {categories.length < 3 && (
            <section className="content-card category-form-card">
              <div className="card-heading">
                <div>
                  <h2><Layers size={18} /> Add Budget Category</h2>
                  <p>Add Operational, SEDP or Development budget</p>
                </div>
              </div>

              <form onSubmit={createCategory}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      name="categoryCode"
                      value={categoryForm.categoryCode}
                      onChange={handleCategoryChange}
                    >
                      {initialCategories
                        .filter(
                          (item) =>
                            !categories.some(
                              (existing) =>
                                existing.categoryCode === item.categoryCode
                            )
                        )
                        .map((item) => (
                          <option
                            key={item.categoryCode}
                            value={item.categoryCode}
                          >
                            {item.categoryName}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Category Budget (BDT) *</label>
                    <input
                      type="number"
                      name="totalAmount"
                      min="0.01"
                      step="0.01"
                      value={categoryForm.totalAmount}
                      onChange={handleCategoryChange}
                      required
                      placeholder="Enter category amount"
                    />
                  </div>

                  <div className="form-group">
                    <label>Remarks</label>
                    <input
                      name="remarks"
                      value={categoryForm.remarks}
                      onChange={handleCategoryChange}
                      placeholder="Optional remarks"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={loading || Number(categoryForm.totalAmount) > remaining}
                  >
                    <Plus size={16} />
                    {loading ? "Saving..." : "Add Category"}
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
