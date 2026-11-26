import { AlertCircle, CheckCircle2, Clock, CircleSlash, CircleDot } from "lucide-react";
import type { EffectiveLoanStatus, ScheduleStatus } from "../types/database";

type AnyStatus = EffectiveLoanStatus | ScheduleStatus;

const STYLES: Record<AnyStatus, { label: string; classes: string; Icon: typeof CheckCircle2 }> = {
  paid: {
    label: "Paid",
    classes: "bg-emerald-50 text-emerald-800 border-emerald-200",
    Icon: CheckCircle2,
  },
  active: {
    label: "Active",
    classes: "bg-blue-50 text-blue-900 border-blue-200",
    Icon: CircleDot,
  },
  pending: {
    label: "Pending",
    classes: "bg-slate-100 text-slate-700 border-slate-200",
    Icon: Clock,
  },
  partial: {
    label: "Partial",
    classes: "bg-amber-50 text-amber-800 border-amber-200",
    Icon: CircleDot,
  },
  overdue: {
    label: "Overdue",
    classes: "bg-red-50 text-red-800 border-red-200",
    Icon: AlertCircle,
  },
  defaulted: {
    label: "Defaulted",
    classes: "bg-zinc-100 text-zinc-800 border-zinc-300",
    Icon: CircleSlash,
  },
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const { label, classes, Icon } = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${classes}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
