import { PasswordForm } from "../../components/PasswordForm";
import { PhoneSignInForm } from "../../components/PhoneSignInForm";
import { useAuth } from "../../context/AuthContext";

export function Profile() {
  const { profile } = useAuth();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-950">Profile</h1>
        <p className="text-sm text-slate-600">Your borrower account details and password.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm">
        <dl className="space-y-3">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Full name</dt>
            <dd className="font-medium text-slate-900">{profile?.full_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{profile?.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Phone</dt>
            <dd className="font-medium text-slate-900 tabular-nums">{profile?.phone ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <PhoneSignInForm contactPhone={profile?.phone ?? null} signInPhone={profile?.sign_in_phone ?? null} />
      <PasswordForm />
    </div>
  );
}
