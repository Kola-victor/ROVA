/*
  # Add Inventory Management Tables

  ## Overview
  Adds full inventory management to KOLO for product/stock tracking.

  ## New Tables

  ### 1. suppliers
  - Supplier/vendor directory linked to user
  - Name, contact, email, phone, address, payment terms

  ### 2. inventory_items
  - Individual product/stock records
  - SKU, name, category, unit, cost price, selling price
  - Current stock qty, reorder level (for low-stock alerts)
  - Linked to supplier

  ### 3. inventory_transactions
  - Every stock movement: purchase (in), sale (out), adjustment, return
  - Links to main transactions table for COGS accounting
  - Tracks quantity change and unit cost at time of movement

  ## Security
  - RLS enabled on all tables
  - All policies restrict to authenticated owners only
*/

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_person text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  payment_terms text DEFAULT 'net_30',
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suppliers"
  ON suppliers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own suppliers"
  ON suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own suppliers"
  ON suppliers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own suppliers"
  ON suppliers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  sku text DEFAULT '',
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT '',
  unit text DEFAULT 'unit',
  cost_price numeric(15,2) DEFAULT 0,
  selling_price numeric(15,2) DEFAULT 0,
  current_stock numeric(15,3) DEFAULT 0,
  reorder_level numeric(15,3) DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory"
  ON inventory_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory"
  ON inventory_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory"
  ON inventory_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory"
  ON inventory_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Inventory transactions (stock movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'write_off')),
  quantity numeric(15,3) NOT NULL,
  unit_cost numeric(15,2) DEFAULT 0,
  total_cost numeric(15,2) DEFAULT 0,
  reference text DEFAULT '',
  notes text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory transactions"
  ON inventory_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory transactions"
  ON inventory_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory transactions"
  ON inventory_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory transactions"
  ON inventory_transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(current_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_user_id ON inventory_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_item_id ON inventory_transactions(item_id);
