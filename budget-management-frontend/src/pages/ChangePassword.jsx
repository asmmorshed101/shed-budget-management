import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../auth/AuthContext";

export default function ChangePassword() {
  const { user, setUser } = useAuth(); const navigate = useNavigate();
  const [currentPassword, setCurrent] = useState(""); const [newPassword, setNext] = useState("");
  const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError(""); setSaved(false);
    try { const { data } = await api.post("/auth/password", { currentPassword, newPassword }); setUser(data); setSaved(true); if (user.mustChangePassword) navigate("/", { replace: true }); }
    catch (err) { setError(err.response?.data?.message || "Could not update password."); }
  };
  return <div className="auth-page"><form className="auth-card" onSubmit={submit}>
    <h1>{user?.mustChangePassword ? "Set a new password" : "Change password"}</h1>
    <p>{user?.mustChangePassword ? "Change the temporary password to continue." : "Choose a new password for your account."}</p>
    {error && <div className="error-message">{error}</div>}{saved && <div className="success-message">Password updated.</div>}
    <div className="form-group"><label>Current password</label><input type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrent(e.target.value)} /></div>
    <div className="form-group"><label>New password (at least 10 characters)</label><input type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={(e) => setNext(e.target.value)} /></div>
    <button className="primary-button">Update password</button>
    {!user?.mustChangePassword && <button type="button" className="secondary-button" onClick={() => navigate(-1)}>Cancel</button>}
  </form></div>;
}
