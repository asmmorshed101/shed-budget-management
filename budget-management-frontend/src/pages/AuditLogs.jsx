import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import api from "../api/axios";

const rows = (data) => Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (requestedPage = page, requestedSearch = search) => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/audit-logs", { params: { page: requestedPage, size: 100, search: requestedSearch } });
      setLogs(rows(data));
      setTotalPages(Number(data?.totalPages || 0));
      setTotalElements(Number(data?.totalElements || 0));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load activity log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page, search); }, [page, search]);

  return <div className="page-container">
    <div className="page-header">
      <div><h1>Activity Log</h1><p>Recent records of who changed data, when, and from which device.</p></div>
      <button className="secondary-button" type="button" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
    </div>
    {error && <div className="error-message">{error}</div>}
    <div className="content-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <div><strong>{totalElements.toLocaleString()}</strong> activities stored</div>
        <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search all activity by user, record, change, or device" aria-label="Search activity log" style={{ width: "min(100%, 420px)", padding: 10, border: "1px solid #cbd5e1", borderRadius: 7 }} />
      </div>
      {loading ? <p>Loading activity…</p> : <div className="table-wrapper"><table><thead><tr>
        <th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Change summary</th><th>Device / IP</th>
      </tr></thead><tbody>
        {logs.length === 0 ? <tr><td colSpan="6">No activity records found.</td></tr> : logs.map((item) => <tr key={item.id}>
          <td style={{ whiteSpace: "nowrap" }}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}</td>
          <td>{item.actorEmail}<div style={{ color: "#64748b", fontSize: 12 }}>User ID: {item.actorUserId ?? "—"}</div></td>
          <td><span className="status-badge">{item.action}</span></td>
          <td>{item.entityType} #{item.entityId || "—"}<div style={{ color: "#64748b", fontSize: 12 }}>{item.endpoint}</div></td>
          <td>{item.summary}</td>
          <td style={{ minWidth: 220 }}><div title={item.userAgent || ""} style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.userAgent || "Unknown device"}</div><div style={{ color: "#64748b", fontSize: 12 }}>IP: {item.ipAddress || "—"}</div></td>
        </tr>)}
      </tbody></table></div>}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 16 }}>
        <button className="secondary-button" type="button" onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={loading || page === 0}>Previous</button>
        <span style={{ color: "#64748b" }}>Page {totalPages === 0 ? 0 : page + 1} of {totalPages}</span>
        <button className="secondary-button" type="button" onClick={() => setPage((current) => current + 1)} disabled={loading || totalPages === 0 || page + 1 >= totalPages}>Next</button>
      </div>
    </div>
  </div>;
}
