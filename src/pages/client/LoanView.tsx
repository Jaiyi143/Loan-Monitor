import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PaymentsTable, ScheduleTable } from "../../components/LoanTables";
import { StatusBadge } from "../../components/StatusBadge";
import { useLoanDetail } from "../../hooks/useLoans";
import { formatDate, formatPHP } from "../../lib/loanMath";

export function ClientLoanView() {
  const { id } = useParams();
  const { loan, schedule, payments, loading, error } = useLoanDetail(id);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading loan details...</div>;
  }

  if (error || !loan) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error ?? "Loan not found."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/my-loans"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to my loans</span>
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 tabular-nums">
              {formatPHP(Number(loan.principal))} Loan
            </h1>
            <p className="text-sm text-slate-600">
              {loan.term_months} months @ {loan.interest_rate}% flat · Started{" "}
              {formatDate(loan.start_date)}
            </p>
          </div>
          <StatusBadge status={loan.effective_status} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total Payable
          </div>
          <div className="mt-1.5 text-xl font-semibold text-slate-950 tabular-nums">
            {formatPHP(Number(loan.total_payable))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Paid</div>
          <div className="mt-1.5 text-xl font-semibold text-emerald-700 tabular-nums">
            {formatPHP(Number(loan.total_paid))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Remaining Balance
          </div>
          <div className="mt-1.5 text-xl font-semibold text-slate-950 tabular-nums">
            {formatPHP(Number(loan.remaining_balance))}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-950">Monthly Schedule</h2>
        <ScheduleTable schedule={schedule} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-950">Payment History</h2>
        <PaymentsTable payments={payments} />
      </section>
    </div>
  );
}
