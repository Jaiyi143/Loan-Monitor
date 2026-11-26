import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/database";

export function ProtectedRoute({ allow }: { allow?: UserRole }) {
  const { user, profile, loading, error, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xs">
          <h1 className="text-base font-semibold text-slate-950">Account setup incomplete</h1>
          <p className="mt-2 text-sm text-slate-600">
            {error ?? "Your user profile could not be loaded."}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-4 cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (allow && profile.role !== allow) {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/my-loans"} replace />;
  }

  return <Outlet />;
}
