import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PaymentsTable, ScheduleTable } from "../../components/LoanTables";
import { StatusBadge } from "../../components/StatusBadge";
import { useLoanDetail } from "../../hooks/useLoans";
import { formatDate, formatPHP, todayIsoDate } from "../../lib/loanMath";
import { supabase } from "../../lib/supabase";
import type { LoanStatus, PaymentMethod, PaymentScheduleRow } from "../../types/database";

export function AdminLoanDetail() {
  const { id } = useParams();
  const { loan, schedule, payments, loading, error, reload } = useLoanDetail(id);

  const [scheduleId, setScheduleId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paidOn, setPaidOn] = useState<string>(todayIsoDate());
  const [method, setMethod] = useState<PaymentMethod>("gcash");
  const [reference, setReference] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSelectInstallment = (row: PaymentScheduleRow) => {
    setScheduleId(row.id);
    setAmount(String(row.amount_due));
    setActionError(null);
  };

  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!loan) return;
    setActionError(null);
    setNotice(null);
    setSaving(true);

    const { error: rpcError } = await supabase.rpc("record_payment", {
      p_loan_id: loan.id,
      p_schedule_id: scheduleId || null,
      p_amount: Number(amount),
      p_paid_on: paidOn,
      p_method: method,
      p_reference: reference.trim() || null,
    });

    if (rpcError) {
      setActionError(rpcError.message);
      setSaving(false);
      return;
    }

    setScheduleId("");
    setAmount("");
    setReference("");
    setNotice("Payment recorded.");
    setSaving(false);
    await reload();
  };

  const handleStatusChange = async (nextStatus: LoanStatus) => {
    if (!loan) return;
    setActionError(null);
    const { error: updateError } = await supabase
      .from("loans")
      .update({ status: nextStatus })
      .eq("id", loan.id);

    if (updateError) {
      setActionError(updateError.message);
      return;
    }
    await reload();
  };

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

  const openInstallments = schedule.filter((s) => s.status !== "paid");

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

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-slate-950">
                {loan.client_name}
              </h1>
              <StatusBadge status={loan.effective_status} />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {loan.client_email} {loan.client_phone ? `· ${loan.client_phone}` : ""} · Started{" "}
              {formatDate(loan.start_date)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="loan-status-select" className="text-xs font-medium text-slate-600">
              Loan status
            </label>
            <select
              id="loan-status-select"
              value={loan.status}
              onChange={(e) => void handleStatusChange(e.target.value as LoanStatus)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
            >
              <option value="active">Active</option>
              <option value="paid">Paid</option>
              <option value="defaulted">Defaulted</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Principal" value={formatPHP(Number(loan.principal))} />
        <SummaryTile
          label={`Total Payable (${loan.interest_rate}% flat)`}
          value={formatPHP(Number(loan.total_payable))}
        />
        <SummaryTile label="Total Paid" value={formatPHP(Number(loan.total_paid))} tone="success" />
        <SummaryTile
          label="Remaining Balance"
          value={formatPHP(Number(loan.remaining_balance))}
          tone={loan.effective_status === "overdue" ? "danger" : "neutral"}
        />
      </div>

      {loan.notes && (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Notes:</span> {loan.notes}
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {actionError && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {actionError}
        </div>
      )}

      <form
        onSubmit={handleRecordPayment}
        className="rounded-lg border border-slate-200 bg-white p-5"
      >
        <h2 className="text-base font-semibold text-slate-950">Record Payment</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="pay-schedule" className="block text-xs font-medium text-slate-700">
              Installment (optional)
            </label>
            <select
              id="pay-schedule"
              value={scheduleId}
              onChange={(e) => {
                const nextId = e.target.value;
                setScheduleId(nextId);
                const match = schedule.find((s) => s.id === nextId);
                if (match && !amount) setAmount(String(match.amount_due));
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">General payment</option>
              {openInstallments.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.installment_number} · {formatDate(s.due_date)} ({formatPHP(Number(s.amount_due))})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pay-amount" className="block text-xs font-medium text-slate-700">
              Amount (₱)
            </label>
            <input
              id="pay-amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="pay-date" className="block text-xs font-medium text-slate-700">
              Paid on
            </label>
            <input
              id="pay-date"
              type="date"
              required
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="pay-method" className="block text-xs font-medium text-slate-700">
              Method
            </label>
            <select
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="gcash">GCash</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="pay-ref" className="block text-xs font-medium text-slate-700">
              Reference (optional)
            </label>
            <input
              id="pay-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Receipt / Ref #"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Recording..." : "Save payment"}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-950">Payment Schedule</h2>
        <ScheduleTable schedule={schedule} onSelectInstallment={handleSelectInstallment} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-950">Payment History</h2>
        <PaymentsTable payments={payments} />
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-red-700"
      : tone === "success"
        ? "text-emerald-700"
        : "text-slate-950";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1.5 text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
