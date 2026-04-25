/*
  # Add Payroll & AI Insights Tables

  ## Overview
  Adds payroll management and AI insights infrastructure to KOLO.

  ## New Tables

  ### 1. employees
  - Employee records: name, role, department, start date, status
  - Stores salary, PAYE rate, pension rate
  - Linked to user account

  ### 2. payroll_runs
  - A payroll run represents one month/period of salary processing
  - Tracks period, status (draft/processed), total gross, total net, total deductions
  - Links to a transaction when salary is paid out

  ### 3. payslips
  - Individual payslip per employee per payroll run
  - Gross salary, PAYE deduction, pension deduction, net pay
  - Links to transaction for the salary expense

  ### 4. ai_insights
  - Stores auto-generated financial insights for the user
  - Type: overspend | drop | opportunity | summary
  - Severity: info | warning | critical

  ## Security
  - RLS enabled on all tables
  - All policies restrict to authenticated users' own data
*/

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  role text DEFAULT '',
  department text DEFAULT '',
  employment_type text DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  gross_salary numeric(15,2) NOT NULL DEFAULT 0,
  paye_rate numeric(5,2) DEFAULT 7.5,
  pension_rate numeric(5,2) DEFAULT 8.0,
  bank_name text DEFAULT '',
  bank_account text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own employees"
  ON employees FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own employees"
  ON employees FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Payroll runs table
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'cancelled')),
  total_gross numeric(15,2) DEFAULT 0,
  total_paye numeric(15,2) DEFAULT 0,
  total_pension numeric(15,2) DEFAULT 0,
  total_net numeric(15,2) DEFAULT 0,
  employee_count integer DEFAULT 0,
  notes text DEFAULT '',
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payroll runs"
  ON payroll_runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payroll runs"
  ON payroll_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payroll runs"
  ON payroll_runs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payroll runs"
  ON payroll_runs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Payslips table
CREATE TABLE IF NOT EXISTS payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gross_salary numeric(15,2) NOT NULL DEFAULT 0,
  paye_deduction numeric(15,2) DEFAULT 0,
  pension_deduction numeric(15,2) DEFAULT 0,
  other_deductions numeric(15,2) DEFAULT 0,
  net_pay numeric(15,2) NOT NULL DEFAULT 0,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payslips"
  ON payslips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payslips"
  ON payslips FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payslips"
  ON payslips FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- AI Insights table
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('overspend', 'drop', 'opportunity', 'summary', 'warning', 'positive')),
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'positive')),
  title text NOT NULL,
  body text NOT NULL,
  metric_key text DEFAULT '',
  metric_value numeric(15,2) DEFAULT 0,
  is_read boolean DEFAULT false,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON ai_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
  ON ai_insights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON ai_insights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
  ON ai_insights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_user_id ON payroll_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_payslips_user_id ON payslips(user_id);
CREATE INDEX IF NOT EXISTS idx_payslips_run_id ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_generated ON ai_insights(generated_at DESC);
