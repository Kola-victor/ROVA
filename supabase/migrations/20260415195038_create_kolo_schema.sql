/*
  # KOLO Financial OS — Initial Schema

  ## Overview
  Creates the full database schema for KOLO, an AI-driven financial operating system.

  ## New Tables

  ### 1. profiles
  - User profile data extending auth.users
  - Stores display name, business name, mode (personal/business), currency, phone

  ### 2. accounts
  - Financial accounts (bank, wallet, cash, etc.)
  - Tracks balance, account type, institution name

  ### 3. transactions
  - All financial transactions
  - Stores amount, type (income/expense/transfer), category, description, date, account_id
  - AI classification fields: ai_category, ai_confidence, is_verified

  ### 4. categories
  - Transaction categories (both system and user-defined)
  - Supports income and expense types

  ### 5. invoices
  - Invoice management for businesses
  - Tracks client, items, amounts, status, due dates

  ### 6. invoice_items
  - Line items for invoices

  ### 7. tax_records
  - Tax filing records and calculations
  - Tracks period, tax type, calculated amount, status

  ### 8. budgets
  - Budget tracking per category
  - Monthly budget limits vs actual spend

  ## Security
  - RLS enabled on all tables
  - All policies restrict access to authenticated users' own data
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  business_name text DEFAULT '',
  mode text DEFAULT 'personal' CHECK (mode IN ('personal', 'business')),
  currency text DEFAULT 'NGN',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'bank' CHECK (type IN ('bank', 'wallet', 'cash', 'investment', 'credit')),
  institution text DEFAULT '',
  balance numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'NGN',
  color text DEFAULT '#9333ea',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  icon text DEFAULT 'circle',
  color text DEFAULT '#9333ea',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and system categories"
  ON categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_system = true);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false)
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false);

-- Seed system categories
INSERT INTO categories (name, type, icon, color, is_system) VALUES
  ('Salary', 'income', 'briefcase', '#22c55e', true),
  ('Business Revenue', 'income', 'trending-up', '#16a34a', true),
  ('Investment Returns', 'income', 'bar-chart', '#15803d', true),
  ('Freelance', 'income', 'laptop', '#4ade80', true),
  ('Rent Received', 'income', 'home', '#86efac', true),
  ('Other Income', 'income', 'plus-circle', '#bbf7d0', true),
  ('Rent & Housing', 'expense', 'home', '#ef4444', true),
  ('Food & Dining', 'expense', 'utensils', '#dc2626', true),
  ('Transportation', 'expense', 'car', '#b91c1c', true),
  ('Utilities', 'expense', 'zap', '#f97316', true),
  ('Healthcare', 'expense', 'heart', '#ec4899', true),
  ('Entertainment', 'expense', 'tv', '#a855f7', true),
  ('Education', 'expense', 'book', '#3b82f6', true),
  ('Shopping', 'expense', 'shopping-bag', '#f59e0b', true),
  ('Inventory', 'expense', 'package', '#8b5cf6', true),
  ('Payroll', 'expense', 'users', '#06b6d4', true),
  ('Marketing', 'expense', 'megaphone', '#14b8a6', true),
  ('Tax Payment', 'expense', 'file-text', '#64748b', true),
  ('Loan Repayment', 'expense', 'credit-card', '#475569', true),
  ('Other Expenses', 'expense', 'minus-circle', '#94a3b8', true)
ON CONFLICT DO NOTHING;

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  description text DEFAULT '',
  notes text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  reference text DEFAULT '',
  ai_category text DEFAULT '',
  ai_confidence numeric(5,2) DEFAULT 0,
  is_verified boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  client_name text NOT NULL,
  client_email text DEFAULT '',
  client_address text DEFAULT '',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal numeric(15,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  total numeric(15,2) DEFAULT 0,
  notes text DEFAULT '',
  currency text DEFAULT 'NGN',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(15,2) NOT NULL,
  amount numeric(15,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Tax records table
CREATE TABLE IF NOT EXISTS tax_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  tax_type text NOT NULL DEFAULT 'VAT' CHECK (tax_type IN ('VAT', 'PIT', 'CIT', 'WHT', 'CGT', 'other')),
  gross_income numeric(15,2) DEFAULT 0,
  deductions numeric(15,2) DEFAULT 0,
  taxable_income numeric(15,2) DEFAULT 0,
  calculated_tax numeric(15,2) DEFAULT 0,
  paid_tax numeric(15,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'filed', 'paid', 'overdue')),
  due_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tax_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tax records"
  ON tax_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax records"
  ON tax_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tax records"
  ON tax_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tax records"
  ON tax_records FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(15,2) NOT NULL,
  period text DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_tax_records_user_id ON tax_records(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
