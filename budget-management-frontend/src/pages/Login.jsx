import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to={user.mustChangePassword ? "/change-password" : "/"} replace />;
  const submit = async (event) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try { const account = await login(email, password); navigate(account.mustChangePassword ? "/change-password" : "/", { replace: true }); }
    catch (e) { setError(e.response?.data?.message || "Email or password is incorrect."); }
    finally { setSubmitting(false); }
  };
  return <div className="auth-page"><form className="auth-card" onSubmit={submit}>
    <h1>SHED Budget</h1><p>Sign in to Budget Management</p>
    {error && <div className="error-message">{error}</div>}
    <div className="form-group"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
    <div className="form-group"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
    <button className="primary-button" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</button>
  </form></div>;
}
