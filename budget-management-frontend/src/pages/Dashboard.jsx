import { useEffect, useState } from "react";
import {
  Wallet,
  TrendingUp,
  CircleDollarSign,
  Percent,
  RefreshCw,
} from "lucide-react";
import api from "../api/axios";
import StatCard from "../components/StatCard";
import { loadActiveMinistryContext } from "../services/budgetContext";


const formatMoney = (amount) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [activeFiscalYear, setActiveFiscalYear] = useState(null);
  const [asOfDate, setAsOfDate] = useState(localDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      // Get the active fiscal year from the database every time the
      // dashboard is loaded/refreshed, rather than using a .env ID.
      const { activeFiscalYear: currentActiveYear, ministry } =
        await loadActiveMinistryContext();

      setActiveFiscalYear(currentActiveYear);

      // Keep the report date inside the active fiscal year's date range.
      const today = localDate(new Date());
      const requestedDate = asOfDate || today;
      const reportDate =
        requestedDate < currentActiveYear.startDate
          ? currentActiveYear.startDate
          : requestedDate > currentActiveYear.endDate
            ? currentActiveYear.endDate
            : requestedDate;

      if (reportDate !== asOfDate) {
        setAsOfDate(reportDate);
      }

      const response = await api.get("/dashboard/summary", {
        params: {
          fiscalYearId: currentActiveYear.id,
          organizationId: ministry.id,
          asOfDate: reportDate,
        },
      });

      setDashboard(response.data);
    } catch (err) {
      setDashboard(null);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Unable to load dashboard data. Please check the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const categories = dashboard?.categories ?? [];

  return (
    <div>
      <div className="page-heading dashboard-heading">
        <div>
          <h1>Dashboard</h1>
          <p>
            Overview of ministry budget and expenditure
            {activeFiscalYear && (
              <strong style={{ marginLeft: "8px", color: "#1d4ed8" }}>
                Active Fiscal Year: {activeFiscalYear.name}
              </strong>
            )}
          </p>
        </div>

        <div className="filter-actions">
          <div className="date-filter">
            <label>Report Date</label>
            <input
              type="date"
              value={asOfDate}
              min={activeFiscalYear?.startDate || undefined}
              max={activeFiscalYear?.endDate || undefined}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>

          <button
            className="primary-button"
            onClick={fetchDashboard}
            disabled={loading}
          >
            <RefreshCw size={17} />
            {loading ? "Loading..." : "Apply Filter"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button onClick={fetchDashboard}>Retry</button>
        </div>
      )}

      {loading && !dashboard ? (
        <div className="loading-state">Loading dashboard...</div>
      ) : dashboard ? (
        <>
          <div className="stat-grid">
            <StatCard
              title="Total Ministry Budget"
              value={formatMoney(dashboard.totalBudget)}
              subtitle="Approved ministry budget"
              icon={Wallet}
              color="blue"
            />

            <StatCard
              title="Total Expenditure"
              value={formatMoney(dashboard.totalExpenditure)}
              subtitle="Cumulative expenditure"
              icon={TrendingUp}
              color="orange"
            />

            <StatCard
              title="Remaining Budget"
              value={formatMoney(dashboard.remainingBudget)}
              subtitle="Available budget"
              icon={CircleDollarSign}
              color="green"
            />

            <StatCard
              title="Budget Utilization"
              value={`${dashboard.utilizationPercentage ?? 0}%`}
              subtitle="Expenditure against total budget"
              icon={Percent}
              color="purple"
            />
          </div>

          <div className="dashboard-grid">
            <section className="content-card">
              <div className="card-heading">
                <div>
                  <h2>Budget Distribution</h2>
                  <p>Category-wise budget and expenditure</p>
                </div>
              </div>

              <div className="category-list">
                {categories.map((category) => {
                  const percentage =
                    Number(category.budget) > 0
                      ? Math.min(
                          100,
                          (Number(category.expenditure) /
                            Number(category.budget)) *
                            100
                        )
                      : 0;

                  return (
                    <div
                      className="category-item"
                      key={category.categoryCode}
                    >
                      <div className="category-top">
                        <strong>{category.categoryName}</strong>
                        <span>{percentage.toFixed(2)}% utilized</span>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      <div className="category-amounts">
                        <span>
                          Budget: {formatMoney(category.budget)}
                        </span>
                        <span>
                          Spent: {formatMoney(category.expenditure)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="content-card">
              <div className="card-heading">
                <div>
                  <h2>Budget Summary</h2>
                  <p>Category-wise financial summary</p>
                </div>
              </div>

              <div className="summary-list">
                <div>
                  <span>Operational Budget</span>
                  <strong>{formatMoney(dashboard.operationalBudget)}</strong>
                </div>
                <div>
                  <span>Operational Expenditure</span>
                  <strong>
                    {formatMoney(dashboard.operationalExpenditure)}
                  </strong>
                </div>
                <div>
                  <span>SEDP Budget</span>
                  <strong>{formatMoney(dashboard.sedpBudget)}</strong>
                </div>
                <div>
                  <span>SEDP Expenditure</span>
                  <strong>{formatMoney(dashboard.sedpExpenditure)}</strong>
                </div>
                <div>
                  <span>Development Budget</span>
                  <strong>{formatMoney(dashboard.developmentBudget)}</strong>
                </div>
                <div>
                  <span>Development Expenditure</span>
                  <strong>
                    {formatMoney(dashboard.developmentExpenditure)}
                  </strong>
                </div>
              </div>
            </section>
          </div>

          <section className="content-card source-card">
            <div className="card-heading">
              <div>
                <h2>Development Source Summary</h2>
                <p>ADP and Block allocation and expenditure</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Allocation</th>
                    <th>Expenditure</th>
                    <th>Remaining</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>ADP</td>
                    <td>{formatMoney(dashboard.developmentAdpBudget)}</td>
                    <td>{formatMoney(dashboard.developmentAdpExpenditure)}</td>
                    <td>
                      {formatMoney(
                        Number(dashboard.developmentAdpBudget ?? 0) -
                          Number(dashboard.developmentAdpExpenditure ?? 0)
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>Block Allocation</td>
                    <td>{formatMoney(dashboard.developmentBlockBudget)}</td>
                    <td>
                      {formatMoney(dashboard.developmentBlockExpenditure)}
                    </td>
                    <td>
                      {formatMoney(
                        Number(dashboard.developmentBlockBudget ?? 0) -
                          Number(dashboard.developmentBlockExpenditure ?? 0)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : !loading && !error ? (
        <div className="empty-state">
          No dashboard data available for the selected date.
        </div>
      ) : null}
    </div>
  );
}
