import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { LoanSummary, PaymentRow, PaymentScheduleRow, Profile } from "../types/database";

export function useLoanSummaries() {
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("loan_summary")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
      setLoans(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loans, loading, error, reload };
}

export function useLoanDetail(loanId: string | undefined) {
  const [loan, setLoan] = useState<LoanSummary | null>(null);
  const [schedule, setSchedule] = useState<PaymentScheduleRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!loanId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [loanRes, schedRes, payRes] = await Promise.all([
      supabase.from("loan_summary").select("*").eq("id", loanId).single(),
      supabase
        .from("payment_schedule")
        .select("*")
        .eq("loan_id", loanId)
        .order("installment_number", { ascending: true }),
      supabase
        .from("payments")
        .select("*")
        .eq("loan_id", loanId)
        .order("paid_on", { ascending: false }),
    ]);

    if (loanRes.error) {
      setError(loanRes.error.message);
      setLoan(null);
    } else if (schedRes.error || payRes.error) {
      setError(schedRes.error?.message ?? payRes.error?.message ?? "Failed to load loan details");
    } else {
      setError(null);
      setLoan(loanRes.data);
      setSchedule(schedRes.data ?? []);
      setPayments(payRes.data ?? []);
    }
    setLoading(false);
  }, [loanId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loan, schedule, payments, loading, error, reload };
}

export function useClients() {
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const reload = useCallback(async (background = false) => {
    const request = ++latestRequest.current;
    if (!background) setLoading(true);
    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "client")
      .order("full_name", { ascending: true });

    if (request !== latestRequest.current) return;

    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
      setClients(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const refreshClients = () => void reload(true);
    void reload();
    window.addEventListener("focus", refreshClients);
    return () => window.removeEventListener("focus", refreshClients);
  }, [reload]);

  return { clients, loading, error, reload };
}
