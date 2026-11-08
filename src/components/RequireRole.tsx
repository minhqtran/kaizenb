import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { canAdmin, canWrite } from "../services/permissions";
import type { UserRole } from "../types/user";

export function RequireRole({ minimumRole }: { minimumRole: UserRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return <div className="loading-state">Checking your account...</div>;

  if (!user)
    return (
      <Navigate
        to={`/signin?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  const allowed =
    minimumRole === "viewer" ||
    (minimumRole === "admin" ? canAdmin(user) : canWrite(user));
  if (!allowed) {
    return (
      <section className="page-container access-denied" role="alert">
        <div className="eyebrow">Access restricted</div>
        <h1>
          This space is for {minimumRole === "admin" ? "admins" : "writers"}.
        </h1>
        <p>
          Your current role is <strong>{user.role}</strong>. Ask an admin to
          update your access.
        </p>
      </section>
    );
  }
  return <Outlet />;
}
