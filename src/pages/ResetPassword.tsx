import { Link, useNavigate } from "react-router-dom";
import { PasswordForm } from "../components/PasswordForm";
import { useAuth } from "../context/AuthContext";

export function ResetPassword() {
  const { authLoading, isPasswordRecovery, finishPasswordRecovery } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        {authLoading ? (
          <p role="status" className="text-sm text-slate-600">Checking reset link...</p>
        ) : isPasswordRecovery ? (
          <PasswordForm
            onSuccess={() => {
              finishPasswordRecovery();
              void navigate("/", { replace: true });
            }}
          />
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h1 className="text-base font-semibold text-slate-950">Reset link unavailable</h1>
            <p className="mt-2 text-sm text-slate-600">Open a password reset link from your email to continue.</p>
            <Link to="/login?reset=1" className="mt-4 inline-block text-sm font-medium text-blue-900 underline">
              Request a new reset link
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
