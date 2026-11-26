import { formatDate, formatPHP, getEffectiveScheduleStatus } from "../lib/loanMath";
import type { PaymentRow, PaymentScheduleRow } from "../types/database";
import { StatusBadge } from "./StatusBadge";

const METHOD_LABELS: Record<PaymentRow["method"], string> = {
  cash: "Cash",
  gcash: "GCash",
  bank_transfer: "Bank transfer",
  other: "Other",
};

export function ScheduleTable({
  schedule,
  onSelectInstallment,
}: {
  schedule: PaymentScheduleRow[];
  onSelectInstallment?: (row: PaymentScheduleRow) => void;
}) {
  if (schedule.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        No scheduled installments found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Due date</th>
            <th className="px-4 py-3 text-right">Amount due</th>
            <th className="px-4 py-3">Status</th>
            {onSelectInstallment && <th className="px-4 py-3 text-right">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {schedule.map((row) => {
            const effectiveStatus = getEffectiveScheduleStatus(row.status, row.due_date);
            return (
              <tr key={row.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium text-slate-900 tabular-nums">
                  {row.installment_number}
                </td>
                <td className="px-4 py-3 text-slate-700 tabular-nums">{formatDate(row.due_date)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900 tabular-nums">
                  {formatPHP(Number(row.amount_due))}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={effectiveStatus} />
                </td>
                {onSelectInstallment && (
                  <td className="px-4 py-3 text-right">
                    {effectiveStatus !== "paid" ? (
                      <button
                        type="button"
                        onClick={() => onSelectInstallment(row)}
                        className="cursor-pointer rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                      >
                        Record payment
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Settled</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PaymentsTable({ payments }: { payments: PaymentRow[] }) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        No payments recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-3">Paid on</th>
            <th className="px-4 py-3">Method</th>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/70">
              <td className="px-4 py-3 text-slate-700 tabular-nums">{formatDate(p.paid_on)}</td>
              <td className="px-4 py-3 text-slate-700">{METHOD_LABELS[p.method]}</td>
              <td className="px-4 py-3 text-slate-500">{p.reference || "—"}</td>
              <td className="px-4 py-3 text-right font-medium text-emerald-700 tabular-nums">
                {formatPHP(Number(p.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
