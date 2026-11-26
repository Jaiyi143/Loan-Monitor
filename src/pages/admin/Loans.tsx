import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Plus } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { useLoanSummaries } from "../../hooks/useLoans";
import { formatDate, formatPHP, toCsv } from "../../lib/loanMath";
import type { EffectiveLoanStatus } from "../../types/database";

const FILTERS: { value: "all" | EffectiveLoanStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "defaulted", label: "Defaulted" },
];

export function AdminLoans() {
  const { loans, loading, error } = useLoanSummaries();
  const [statusFilter, setStatusFilter] = useState<"all" | EffectiveLoanStatus>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const visible = loans.filter((loan) => {
    if (statusFilter !== "all" && loan.effective_status !== statusFilter) return false;
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      loan.client_name.toLowerCase().includes(q) ||
      loan.client_email.toLowerCase().includes(q)
    );
  });

  const handleExportCsv = () => {
    const csv = toCsv(
      [
        "Client",
        "Email",
        "Principal",
        "Interest (%)",
        "Term (Months)",
        "Total Payable",
        "Total Paid",
        "Remaining Balance",
        "Next Due Date",
        "Status",
      ],
      visible.map((l) => [
        l.client_name,
        l.client_email,
        l.principal,
        l.interest_rate,
        l.term_months,
        l.total_payable,
        l.total_paid,
        l.remaining_balance,
        l.next_due_date,
        l.effective_status,
      ]),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loans-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">All Loans</h1>
          <p className="text-sm text-slate-600">Filter by status, inspect details, or export CSV.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={visible.length === 0}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
          <Link
            to="/admin/loans/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New loan</span>
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status filter">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                statusFilter === f.value
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          aria-label="Filter loans by client"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client..."
          className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading loans...
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No loans match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3 text-right">Principal</th>
                <th className="px-4 py-3 text-right">Total payable</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3">Next due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link to={`/admin/loans/${loan.id}`} className="hover:underline">
                      {loan.client_name}
                    </Link>
                    <div className="text-xs font-normal text-slate-500">
                      {loan.term_months} mo @ {loan.interest_rate}% flat
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                    {formatPHP(Number(loan.principal))}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                    {formatPHP(Number(loan.total_payable))}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700 tabular-nums">
                    {formatPHP(Number(loan.total_paid))}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-950 tabular-nums">
                    {formatPHP(Number(loan.remaining_balance))}
                  </td>
                  <td className="px-4 py-3 text-slate-700 tabular-nums">
                    {formatDate(loan.next_due_date)}
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
    </div>
  );
}
