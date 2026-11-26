import { Link } from "react-router-dom";
import { StatusBadge } from "../../components/StatusBadge";
import { useLoanSummaries } from "../../hooks/useLoans";
import { formatDate, formatInterestRate, formatPHP } from "../../lib/loanMath";

export function MyLoans() {
  const { loans, loading, error } = useLoanSummaries();

  const totalRemaining = loans.reduce((sum, l) => sum + Number(l.remaining_balance), 0);
  const totalPaid = loans.reduce((sum, l) => sum + Number(l.total_paid), 0);
  const nextDue = loans
    .filter((l) => l.next_due_date)
    .map((l) => l.next_due_date!)
    .sort()[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-950">My Loans</h1>
        <p className="text-sm text-slate-600">Your loan balances, due dates, and payment status.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Remaining Balance
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-950 tabular-nums">
            {formatPHP(totalRemaining)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total Paid
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-emerald-700 tabular-nums">
            {formatPHP(totalPaid)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Next Due Date
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-950 tabular-nums">
            {formatDate(nextDue)}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading your loans...
        </div>
      ) : loans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          You have no loans on record yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {loans.map((loan) => (
            <Link
              key={loan.id}
              to={`/my-loans/${loan.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-5 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-slate-950 tabular-nums">
                    {formatPHP(Number(loan.principal))}
                  </div>
                  <div className="text-xs text-slate-500">
                    {loan.term_months} months · {formatInterestRate(loan.interest_rate, loan.interest_rate_period)} · Started{" "}
                    {formatDate(loan.start_date)}
                  </div>
                </div>
                <StatusBadge status={loan.effective_status} />
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                <div>
                  <dt className="text-slate-500">Paid</dt>
                  <dd className="mt-0.5 font-semibold text-emerald-700 tabular-nums">
                    {formatPHP(Number(loan.total_paid))}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Remaining</dt>
                  <dd className="mt-0.5 font-semibold text-slate-950 tabular-nums">
                    {formatPHP(Number(loan.remaining_balance))}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Next due</dt>
                  <dd className="mt-0.5 font-semibold text-slate-800 tabular-nums">
                    {formatDate(loan.next_due_date)}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
