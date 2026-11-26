import { Link } from "react-router-dom";
import { AlertTriangle, Banknote, CheckCircle2, Plus, Wallet } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { useLoanSummaries } from "../../hooks/useLoans";
import { formatDate, formatPHP } from "../../lib/loanMath";

export function AdminDashboard() {
  const { loans, loading, error } = useLoanSummaries();

  const totalLent = loans.reduce((sum, l) => sum + Number(l.principal), 0);
  const totalCollected = loans.reduce((sum, l) => sum + Number(l.total_paid), 0);
  const totalOutstanding = loans.reduce((sum, l) => sum + Number(l.remaining_balance), 0);
  const overdueLoans = loans.filter((l) => l.effective_status === "overdue");
  const overdueBalance = overdueLoans.reduce((sum, l) => sum + Number(l.remaining_balance), 0);

  const attentionList = loans
    .filter((l) => l.effective_status !== "paid")
    .sort((a, b) => {
      if (a.effective_status === "overdue" && b.effective_status !== "overdue") return -1;
      if (b.effective_status === "overdue" && a.effective_status !== "overdue") return 1;
      return (a.next_due_date ?? "9999-12-31").localeCompare(b.next_due_date ?? "9999-12-31");
    })
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">Lender Overview</h1>
          <p className="text-sm text-slate-600">Flat-rate monthly loan portfolio summary.</p>
        </div>
        <Link
          to="/admin/loans/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New loan</span>
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Principal Lent" value={formatPHP(totalLent)} icon={Banknote} />
        <StatCard
          label="Total Collected"
          value={formatPHP(totalCollected)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard label="Outstanding Balance" value={formatPHP(totalOutstanding)} icon={Wallet} />
        <StatCard
          label={`Overdue (${overdueLoans.length})`}
          value={formatPHP(overdueBalance)}
          icon={AlertTriangle}
          tone={overdueLoans.length > 0 ? "danger" : "neutral"}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">Active &amp; Overdue Loans</h2>
          <Link to="/admin/loans" className="text-sm font-medium text-blue-900 hover:underline">
            View all loans
          </Link>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading portfolio...
          </div>
        ) : attentionList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">No active loans yet.</p>
            <Link
              to="/admin/loans/new"
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Create first loan
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Next due</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attentionList.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link to={`/admin/loans/${loan.id}`} className="hover:underline">
                        {loan.client_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700 tabular-nums">
                      {formatDate(loan.next_due_date)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                      {formatPHP(Number(loan.total_paid))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 tabular-nums">
                      {formatPHP(Number(loan.remaining_balance))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={loan.effective_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: typeof Banknote;
  tone?: "neutral" | "success" | "danger";
}) {
  const accent =
    tone === "danger"
      ? "text-red-700"
      : tone === "success"
        ? "text-emerald-700"
        : "text-slate-950";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${accent}`}>
        {value}
      </div>
    </div>
  );
}
