import { describe, expect, it } from "vitest";
import {
  addMonthsIso,
  formatPHP,
  generateFlatMonthlySchedule,
  getEffectiveScheduleStatus,
  toCsv,
} from "./loanMath";

describe("addMonthsIso", () => {
  it("clamps month-end dates like Jan 31 to Feb 28/29", () => {
    expect(addMonthsIso("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsIso("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonthsIso("2026-01-31", 2)).toBe("2026-03-31");
  });
});

describe("generateFlatMonthlySchedule", () => {
  it("computes flat interest and splits evenly with cent-exact final installment", () => {
    const result = generateFlatMonthlySchedule(10000, 10, 3, "2026-01-15");
    expect(result.totalInterest).toBe(1000);
    expect(result.totalPayable).toBe(11000);
    expect(result.installments).toEqual([
      { installmentNumber: 1, dueDate: "2026-02-15", amountDue: 3666.66 },
      { installmentNumber: 2, dueDate: "2026-03-15", amountDue: 3666.66 },
      { installmentNumber: 3, dueDate: "2026-04-15", amountDue: 3666.68 },
    ]);
    const sum = result.installments.reduce((acc, row) => acc + row.amountDue, 0);
    expect(Math.round(sum * 100) / 100).toBe(11000);
  });

  it("supports zero interest loans", () => {
    const result = generateFlatMonthlySchedule(6000, 0, 6, "2026-05-01");
    expect(result.totalInterest).toBe(0);
    expect(result.totalPayable).toBe(6000);
    expect(result.installments).toHaveLength(6);
    expect(result.installments[0].amountDue).toBe(1000);
  });

  it("rejects invalid parameters", () => {
    expect(() => generateFlatMonthlySchedule(0, 10, 3, "2026-01-01")).toThrow();
    expect(() => generateFlatMonthlySchedule(1000, -1, 3, "2026-01-01")).toThrow();
    expect(() => generateFlatMonthlySchedule(1000, 10, 0, "2026-01-01")).toThrow();
  });
});

describe("getEffectiveScheduleStatus", () => {
  it("marks past-due pending and partial installments as overdue, but never paid", () => {
    expect(getEffectiveScheduleStatus("pending", "2026-11-25", "2026-11-26")).toBe("overdue");
    expect(getEffectiveScheduleStatus("partial", "2026-11-25", "2026-11-26")).toBe("overdue");
    expect(getEffectiveScheduleStatus("paid", "2026-11-25", "2026-11-26")).toBe("paid");
    expect(getEffectiveScheduleStatus("pending", "2026-11-26", "2026-11-26")).toBe("pending");
  });
});

describe("formatPHP & toCsv", () => {
  it("formats peso currency and escapes CSV safely", () => {
    expect(formatPHP(12500.5)).toContain("12,500.50");
    expect(toCsv(["Name", "Amount"], [['Doe, "Jane"', "=1000"]])).toBe(
      'Name,Amount\r\n"Doe, ""Jane""",\'=1000',
    );
  });
});
