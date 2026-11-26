import { useState, type FormEvent } from "react";
import { normalizePhoneNumber } from "../lib/phoneNumber";
import { supabase } from "../lib/supabase";

export function PhoneSignInForm({ contactPhone, signInPhone }: { contactPhone: string | null; signInPhone: string | null }) {
  const [phone, setPhone] = useState(signInPhone ?? contactPhone ?? "");
  const [savedPhone, setSavedPhone] = useState(signInPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const number = normalizePhoneNumber(phone);
    if (!number) {
      setError("Enter a valid phone number with its country code, or a Philippine mobile number starting with 09.");
      return;
    }

    setSaving(true);
    const { data, error: saveError } = await supabase.rpc("set_my_sign_in_phone", { p_phone: number });
    if (saveError) setError(saveError.message);
    else if (data) {
      setSavedPhone(data);
      setPhone(data);
    }
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-950">Phone sign-in</h2>
      <p role="status" className="text-sm text-slate-600">
        {savedPhone ? `You can sign in with ${savedPhone} and your password.` : "Add a phone number to use with your password when signing in."}
      </p>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <div>
        <label htmlFor="sign-in-phone" className="block text-sm font-medium text-slate-800">Sign-in phone number</label>
        <input
          id="sign-in-phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save sign-in phone"}
      </button>
    </form>
  );
}
