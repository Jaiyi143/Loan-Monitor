import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useClients } from "../../hooks/useLoans";
import { formatDate, formatPHP, generateFlatMonthlySchedule, todayIsoDate } from "../../lib/loanMath";
import { supabase } from "../../lib/supabase";

export function NewLoan() {
  const navigate = useNavigate();
  const { clients, loading: loadingClients } = useClients();

  const [clientId, setClientId] = useState("");
  const [principal, setPrincipal] = useState("10000");
  const [interestRate, setInterestRate] = useState("10");
  const [termMonths, setTermMonths] = useState("6");
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const p = Number(principal);
    const r = Number(interestRate);
    const t = Number(termMonths);
    if (!(p > 0) || r < 0 || !Number.isInteger(t) || t <= 0 || !startDate) return null;
    try {
      return generateFlatMonthlySchedule(p, r, t, startDate);
    } catch {
      return null;
    }
  }, [principal, interestRate, termMonths, startDate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!clientId) {
      setError("Select a client.");
      return;
    }
    setSaving(true);

    const { data: loanId, error: rpcError } = await supabase.rpc("create_loan_with_schedule", {
      p_client_id: clientId,
      p_principal: Number(principal),
      p_interest_rate: Number(interestRate),
      p_term_months: Number(termMonths),
      p_start_date: startDate,
      p_notes: notes.trim() || null,
    });

    if (rpcError || !loanId) {
      setError(rpcError?.message ?? "Failed to create loan");
      setSaving(false);
      return;
    }

    navigate(`/admin/loans/${loanId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/loans"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to loans</span>
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Create Loan</h1>
        <p className="text-sm text-slate-600">
          Flat-rate total interest split into equal monthly installments.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2"
        >
          <div>
            <label htmlFor="loan-client" className="block text-sm font-medium text-slate-800">
              Client
            </label>
            <select
              id="loan-client"
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={loadingClients}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">{loadingClients ? "Loading clients..." : "Select a client"}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="loan-principal" className="block text-sm font-medium text-slate-800">
              Principal (₱)
            </label>
            <input
              id="loan-principal"
              type="number"
              step="0.01"
              min="1"
              required
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="loan-rate" className="block text-sm font-medium text-slate-800">
                Flat interest (%)
              </label>
              <input
                id="loan-rate"
                type="number"
                step="0.01"
                min="0"
                required
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="loan-term" className="block text-sm font-medium text-slate-800">
                Term (months)
              </label>
              <input
                id="loan-term"
                type="number"
                step="1"
                min="1"
                max="360"
                required
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label htmlFor="loan-start" className="block text-sm font-medium text-slate-800">
              Release / start date
            </label>
            <input
              id="loan-start"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="loan-notes" className="block text-sm font-medium text-slate-800">
              Notes (optional)
            </label>
            <textarea
              id="loan-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Purpose, collateral, or agreement notes"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !preview}
            className="w-full cursor-pointer rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creating loan..." : "Create loan & schedule"}
          </button>
        </form>

        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 lg:col-span-3">
          <h2 className="text-base font-semibold text-slate-950">Schedule Preview</h2>
          {!preview ? (
            <p className="text-sm text-slate-500">Enter valid loan terms to preview monthly due dates.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 rounded-md bg-slate-50 p-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Total interest</div>
                  <div className="font-semibold text-slate-900 tabular-nums">
                    {formatPHP(preview.totalInterest)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Total payable</div>
                  <div className="font-semibold text-slate-950 tabular-nums">
                    {formatPHP(preview.totalPayable)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Monthly</div>
                  <div className="font-semibold text-slate-900 tabular-nums">
                    {formatPHP(preview.installments[0].amountDue)}
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-md border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Due date</th>
                      <th className="px-4 py-2.5 text-right">Amount due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.installments.map((row) => (
                      <tr key={row.installmentNumber}>
                        <td className="px-4 py-2 tabular-nums">{row.installmentNumber}</td>
                        <td className="px-4 py-2 text-slate-700 tabular-nums">
                          {formatDate(row.dueDate)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-slate-900 tabular-nums">
                          {formatPHP(row.amountDue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
