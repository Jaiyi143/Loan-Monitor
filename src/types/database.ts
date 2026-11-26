export type UserRole = "admin" | "client";
export type LoanStatus = "active" | "paid" | "defaulted";
export type EffectiveLoanStatus = LoanStatus | "overdue";
export type ScheduleStatus = "pending" | "paid" | "partial" | "overdue";
export type PaymentMethod = "cash" | "gcash" | "bank_transfer" | "other";
export type InterestRatePeriod = "total" | "monthly";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
};

export type LoanSummary = {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  principal: number;
  interest_rate: number;
  interest_rate_period: InterestRatePeriod;
  term_months: number;
  start_date: string;
  status: LoanStatus;
  notes: string | null;
  created_at: string;
  total_interest: number;
  total_payable: number;
  total_paid: number;
  remaining_balance: number;
  next_due_date: string | null;
  overdue_count: number;
  effective_status: EffectiveLoanStatus;
};

export type PaymentScheduleRow = {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  status: ScheduleStatus;
};

export type PaymentRow = {
  id: string;
  loan_id: string;
  schedule_id: string | null;
  amount: number;
  paid_on: string;
  method: PaymentMethod;
  reference: string | null;
  recorded_by: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          role?: UserRole;
        };
        Update: {
          email?: string;
          full_name?: string;
          phone?: string | null;
          role?: UserRole;
        };
        Relationships: [];
      };
      loans: {
        Row: {
          id: string;
          client_id: string;
          principal: number;
          interest_rate: number;
          interest_rate_period: InterestRatePeriod;
          term_months: number;
          start_date: string;
          status: LoanStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          client_id: string;
          principal: number;
          interest_rate: number;
          interest_rate_period?: InterestRatePeriod;
          term_months: number;
          start_date: string;
          status?: LoanStatus;
          notes?: string | null;
        };
        Update: {
          status?: LoanStatus;
          notes?: string | null;
        };
        Relationships: [];
      };
      payment_schedule: {
        Row: PaymentScheduleRow;
        Insert: {
          loan_id: string;
          installment_number: number;
          due_date: string;
          amount_due: number;
          status?: ScheduleStatus;
        };
        Update: {
          status?: ScheduleStatus;
        };
        Relationships: [];
      };
      payments: {
        Row: PaymentRow;
        Insert: {
          loan_id: string;
          schedule_id?: string | null;
          amount: number;
          paid_on?: string;
          method?: PaymentMethod;
          reference?: string | null;
          recorded_by: string;
        };
        Update: {
          amount?: number;
          paid_on?: string;
          method?: PaymentMethod;
          reference?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      loan_summary: {
        Row: LoanSummary;
        Relationships: [];
      };
    };
    Functions: {
      create_loan_with_schedule: {
        Args: {
          p_client_id: string;
          p_principal: number;
          p_interest_rate: number;
          p_term_months: number;
          p_start_date: string;
          p_notes?: string | null;
          p_interest_rate_period?: InterestRatePeriod;
        };
        Returns: string;
      };
      record_payment: {
        Args: {
          p_loan_id: string;
          p_schedule_id: string | null;
          p_amount: number;
          p_paid_on: string;
          p_method: PaymentMethod;
          p_reference?: string | null;
        };
        Returns: string;
      };
    };
  };
};
