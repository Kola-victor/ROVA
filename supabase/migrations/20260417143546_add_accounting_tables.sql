/*
  # Add Accounting Tables

  ## Overview
  Adds double-entry bookkeeping and chart of accounts support to KOLO.

  ## New Tables

  ### 1. chart_of_accounts
  - Stores all account codes (assets, liabilities, equity, income, expenses)
  - Customizable by user, with system defaults seeded
  - account_type: asset | liability | equity | income | expense
  - normal_balance: debit | credit

  ### 2. journal_entries
  - Manual and automated journal entry headers
  - Each entry has a reference, date, description, and source (manual/auto)

  ### 3. journal_entry_lines
  - Individual debit/credit lines for each journal entry
  - Must balance (total debits = total credits per entry)

  ## Security
  - RLS enabled on all three tables
  - All policies restrict to authenticated users' own data
*/

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  normal_balance text NOT NULL DEFAULT 'debit' CHECK (normal_balance IN ('debit', 'credit')),
  description text DEFAULT '',
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  parent_id uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON chart_of_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON chart_of_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON chart_of_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON chart_of_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false);

-- Journal Entries (header)
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_number text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  reference text DEFAULT '',
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'transaction', 'invoice', 'auto')),
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  is_posted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal entries"
  ON journal_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
  ON journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON journal_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Journal Entry Lines (debit/credit lines)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id uuid REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  account_name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  debit numeric(15,2) DEFAULT 0,
  credit numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal entry lines"
  ON journal_entry_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_lines.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own journal entry lines"
  ON journal_entry_lines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_lines.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own journal entry lines"
  ON journal_entry_lines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_lines.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_lines.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own journal entry lines"
  ON journal_entry_lines FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_entry_lines.journal_entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coa_user_id ON chart_of_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry_id ON journal_entry_lines(journal_entry_id);
