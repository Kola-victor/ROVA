/*
  # Add Team Access Control & Notifications Tables

  ## Overview
  Adds multi-user team management and a notifications/automation system.

  ## New Tables

  ### 1. team_members
  - Links users to a business "owner" account
  - Role: admin | accountant | staff | viewer
  - Status: pending (invite) | active | suspended
  - invite_email for pending invitations

  ### 2. activity_logs
  - Immutable audit log of user actions within the system
  - action: created | updated | deleted | viewed | processed
  - entity_type: transaction | invoice | employee | payroll | inventory | etc.
  - Stores before/after metadata as JSON

  ### 3. notifications
  - User notification inbox
  - type: payment_reminder | tax_deadline | low_stock | cash_warning | invoice_due | payroll | info
  - severity: info | warning | critical
  - is_read, action_url for deep-linking

  ## Security
  - RLS enabled on all tables
  - Team members can only view their own membership records
  - Activity logs visible to business owner and admins
  - Notifications are strictly per-user
*/

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_email text DEFAULT '',
  role text DEFAULT 'staff' CHECK (role IN ('admin', 'accountant', 'staff', 'viewer')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  permissions jsonb DEFAULT '{}',
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their team"
  ON team_members FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = member_id);
CREATE POLICY "Owners can insert team members"
  ON team_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update team members"
  ON team_members FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can delete team members"
  ON team_members FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'viewed', 'processed', 'sent', 'paid', 'approved')),
  entity_type text NOT NULL,
  entity_id text DEFAULT '',
  entity_label text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  ip_address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert activity logs"
  ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND auth.uid() = owner_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('payment_reminder', 'tax_deadline', 'low_stock', 'cash_warning', 'invoice_due', 'payroll', 'info', 'success', 'error')),
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'success')),
  title text NOT NULL,
  body text DEFAULT '',
  action_url text DEFAULT '',
  action_label text DEFAULT '',
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  scheduled_for timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_owner_id ON team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_owner_id ON activity_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
