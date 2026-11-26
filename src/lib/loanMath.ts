import type { ScheduleStatus } from "../types/database";

export interface GeneratedInstallment {
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
}

export interface FlatScheduleResult {
  totalInterest: number;
  totalPayable: number;
  installments: GeneratedInstallment[];
}

export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addMonthsIso(startDateIso: string, monthsToAdd: number): string {
  const [yStr, mStr, dStr] = startDateIso.split("-");
  const year = Number(yStr);
  const monthIndex = Number(mStr) - 1;
  const day = Number(dStr);

  const totalMonths = year * 12 + monthIndex + monthsToAdd;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIndex = totalMonths % 12;
  const maxDayInMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, maxDayInMonth);

  return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

export function generateFlatMonthlySchedule(
  principal: number,
  interestRatePercent: number,
  termMonths: number,
  startDateIso: string,
): FlatScheduleResult {
  if (!(principal > 0) || interestRatePercent < 0 || !Number.isInteger(termMonths) || termMonths <= 0) {
    throw new Error("Invalid loan parameters");
  }

  const totalInterest = roundCents(principal * (interestRatePercent / 100));
  const totalPayable = roundCents(principal + totalInterest);
  const baseInstallment = Math.floor((totalPayable / termMonths) * 100) / 100;
  const lastInstallment = roundCents(totalPayable - baseInstallment * (termMonths - 1));

  const installments: GeneratedInstallment[] = [];
  for (let i = 1; i <= termMonths; i++) {
    installments.push({
      installmentNumber: i,
      dueDate: addMonthsIso(startDateIso, i),
      amountDue: i === termMonths ? lastInstallment : baseInstallment,
    });
  }

  return { totalInterest, totalPayable, installments };
}

export function getEffectiveScheduleStatus(
  status: ScheduleStatus,
  dueDate: string,
  todayIso: string = todayIsoDate(),
): ScheduleStatus {
  if (status === "paid") return "paid";
  if (dueDate < todayIso) return "overdue";
  return status;
}

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPHP(amount: number): string {
  return phpFormatter.format(amount);
}

export function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
}
