import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Landmark, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function Login() {
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!loading && user && profile) {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/my-loans"} replace />;
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
    }
    setSubmitting(false);
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/profile`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setNotice("If an account matches that email, a password reset link has been sent.");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-950">Loan Monitor</h1>
            <p className="text-xs text-slate-500">Private lending &amp; borrower portal</p>
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
          >
            Missing <code>VITE_SUPABASE_URL</code> or <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in
            your environment. Copy <code>.env.example</code> to <code>.env</code> to connect.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {notice}
          </div>
        )}

        <form onSubmit={resetMode ? handleReset : handleLogin} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-800">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          {!resetMode && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-800">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !isSupabaseConfigured}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span>
              {submitting
                ? "Please wait..."
                : resetMode
                  ? "Send reset link"
                  : "Sign in"}
            </span>
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={() => {
              setResetMode((prev) => !prev);
              setError(null);
              setNotice(null);
            }}
            className="cursor-pointer font-medium text-blue-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            {resetMode ? "Back to sign in" : "Forgot password?"}
          </button>
          <span>Invite-only accounts</span>
        </div>
      </div>
    </div>
  );
}
