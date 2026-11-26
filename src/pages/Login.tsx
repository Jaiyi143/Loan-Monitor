import { useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Landmark, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { normalizePhoneNumber } from "../lib/phoneNumber";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function Login({ createAccount = false }: { createAccount?: boolean }) {
  const { user, profile, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(() => !createAccount && searchParams.get("reset") === "1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const emailOnly = createAccount || resetMode;

  if (!resetMode && !loading && user && profile) {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/my-loans"} replace />;
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const identifier = email.trim();
    const phoneNumber = identifier.includes("@") ? null : normalizePhoneNumber(identifier);
    if (!identifier.includes("@") && !phoneNumber) {
      setError("Enter your email address or a valid phone number.");
      return;
    }

    setSubmitting(true);
    const credentials = phoneNumber ? { phone: phoneNumber, password } : { email: identifier, password };
    const { error: authError } = await supabase.auth.signInWithPassword(credentials);

    if (authError) {
      setError(authError.code === "phone_provider_disabled"
        ? "Phone sign-in is currently unavailable. Sign in with your email."
        : authError.code === "phone_not_confirmed"
          ? "Sign in with your email and verify your phone in Profile."
          : authError.message);
    }
    setSubmitting(false);
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setNotice("If an account matches that email, a password reset link has been sent.");
    }
    setSubmitting(false);
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const name = fullName.trim();
    if (!name) {
      setError("Enter your full name.");
      return;
    }
    const contactPhone = normalizePhoneNumber(phone);
    if (!contactPhone) {
      setError("Enter a valid phone number, such as 0917 123 4567 or a number with its country code.");
      return;
    }

    setSubmitting(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name, contact_phone: contactPhone, borrower_registration: true },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (signupError) {
      setError(signupError.message);
    } else if (!data.session) {
      setPassword("");
      setNotice("Confirm your email first. After signing in, verify your phone in Profile to use it for sign-in.");
    }
    setSubmitting(false);
  };

  const submit = createAccount ? handleCreateAccount : resetMode ? handleReset : handleLogin;
  const actionLabel = createAccount ? "Create account" : resetMode ? "Send reset link" : "Sign in";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-950">
              {createAccount ? "Create a borrower account" : "Loan Monitor"}
            </h1>
            {!createAccount && <p className="text-xs text-slate-500">Private lending &amp; borrower portal</p>}
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

        <form onSubmit={submit} className="mt-6 space-y-4">
          {createAccount && (
            <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-slate-800">
                Full name
              </label>
              <input
                id="full-name"
                type="text"
                required
                maxLength={120}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-800">
              {emailOnly ? "Email address" : "Email or phone number"}
            </label>
            <input
              id="email"
              type={emailOnly ? "email" : "text"}
              required
              autoComplete={emailOnly ? "email" : "username"}
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
            />
          </div>

          {createAccount && (
            <div>
              <label htmlFor="signup-phone" className="block text-sm font-medium text-slate-800">
                Phone number
              </label>
              <input
                id="signup-phone"
                type="tel"
                autoComplete="tel"
                required
                aria-describedby="signup-phone-hint"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
              />
              <p id="signup-phone-hint" className="mt-1 text-xs text-slate-600">
                Use a Philippine mobile number or include your country code.
              </p>
            </div>
          )}

          {!resetMode && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-800">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete={createAccount ? "new-password" : "current-password"}
                minLength={createAccount ? 8 : undefined}
                aria-describedby={createAccount ? "signup-password-hint" : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
              />
              {createAccount && <p id="signup-password-hint" className="mt-1 text-xs text-slate-600">Use at least 8 characters.</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !isSupabaseConfigured}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span>{submitting ? "Please wait..." : actionLabel}</span>
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          {createAccount ? (
            <Link to="/login" className="font-medium text-blue-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
              Back to sign in
            </Link>
          ) : (
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
          )}
          {!createAccount && !resetMode && (
            <Link to="/signup" className="font-medium text-blue-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
              Create account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
