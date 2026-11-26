import { useState, type FormEvent } from "react";
import { normalizePhoneNumber } from "../lib/phoneNumber";
import { supabase } from "../lib/supabase";

export function PhoneSignInForm({ contactPhone, signInPhone, onSaved }: {
  contactPhone: string | null;
  signInPhone: string | null;
  onSaved: () => void;
}) {
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
      onSaved();
    }
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-950">Phone number</h2>
      <p role="status" className="text-sm text-slate-600">
        {savedPhone ? "Your lender sees this number. You can also use it to sign in." : "Add a phone number for your lender to contact you and for signing in."}
      </p>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <div>
        <label htmlFor="sign-in-phone" className="block text-sm font-medium text-slate-800">Phone number</label>
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
        {saving ? "Saving..." : "Save phone number"}
      </button>
    </form>
  );
}
