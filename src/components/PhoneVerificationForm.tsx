import { useState, type FormEvent } from "react";
import { normalizePhoneNumber } from "../lib/phoneNumber";
import { supabase } from "../lib/supabase";

export function PhoneVerificationForm({ contactPhone, verifiedPhone }: {
  contactPhone: string | null;
  verifiedPhone: string | null;
}) {
  const [phone, setPhone] = useState(contactPhone ?? "");
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const number = normalizePhoneNumber(phone);
    if (!number) {
      setError("Enter a valid mobile number with its country code, or a Philippine number starting with 09.");
      return;
    }

    setSubmitting(true);
    const { error: sendError } = await supabase.auth.updateUser({ phone: number });
    if (sendError) {
      setError(sendError.code === "phone_provider_disabled" || sendError.code === "sms_send_failed"
        ? "SMS verification is currently unavailable. You can still sign in with your email."
        : sendError.message);
    } else {
      setCode("");
      setPendingPhone(number);
    }
    setSubmitting(false);
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!pendingPhone) return;
    setError(null);
    setSubmitting(true);

    const { error: verificationError } = await supabase.auth.verifyOtp({
      phone: pendingPhone,
      token: code.trim(),
      type: "phone_change",
    });
    if (verificationError) setError(verificationError.message);
    setSubmitting(false);
  };

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-950">Phone sign-in</h2>
      {verifiedPhone ? (
        <p className="text-sm text-slate-600">You can sign in with {verifiedPhone} and your password.</p>
      ) : (
        <form onSubmit={pendingPhone ? verifyCode : sendCode} className="space-y-4">
          <p className="text-sm text-slate-600">
            {pendingPhone ? `Enter the SMS code sent to ${pendingPhone}.` : "Verify your phone number to sign in with it and your password."}
          </p>
          {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
          {pendingPhone ? (
            <div>
              <label htmlFor="phone-code" className="block text-sm font-medium text-slate-800">Verification code</label>
              <input id="phone-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
                required maxLength={6} value={code} onChange={(event) => setCode(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          ) : (
            <div>
              <label htmlFor="verification-phone" className="block text-sm font-medium text-slate-800">Phone number</label>
              <input id="verification-phone" type="tel" autoComplete="tel" required value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={submitting}
              className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              {submitting ? "Please wait..." : pendingPhone ? "Verify phone" : "Send verification code"}
            </button>
            {pendingPhone && (
              <button type="button" disabled={submitting} onClick={() => { setPendingPhone(null); setError(null); }}
                className="text-sm font-medium text-blue-900 hover:underline disabled:opacity-50">
                Start again
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
