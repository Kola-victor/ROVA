import { useState, type FormEvent } from 'react';
import { Shield, UserPlus, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function OnboardingPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleOnboard(e: FormEvent) {
    e.preventDefault();
    if (!form.email || !form.fullName) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          redirectTo: `${window.location.origin}/accept-invite`
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to invite staff');
      }

      setSuccess(true);
      setForm({ fullName: '', email: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to onboard staff.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48,
          background: 'linear-gradient(135deg, var(--accent-primary), #7e22ce)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <UserPlus size={24} color="white" />
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Onboard Staff</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Create an account for a new staff member. They will receive an email to confirm their account.
        </p>
      </div>

      <Card>
        <form onSubmit={handleOnboard} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Staff Full Name"
            placeholder="Jane Doe"
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            required
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="jane@company.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            prefix={<Mail size={14} />}
            required
          />
          <div style={{ padding: '12px 14px', background: 'var(--info-dim)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 10 }}>
            <Shield size={16} color="var(--info)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, color: 'var(--info)', lineHeight: 1.5 }}>
              <strong>Important:</strong> An invite email will be sent to the staff member. They will need to click the link in the email to set their password and activate their account.
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 12px', background: 'var(--error-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--error)', fontSize: 13 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '10px 12px', background: 'var(--success-dim)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: 13 }}>
              Staff account created successfully! A confirmation email has been sent.
            </div>
          )}

          <Button variant="primary" loading={loading} type="submit" style={{ marginTop: 8 }}>
            Create Staff Account
          </Button>
        </form>
      </Card>
    </div>
  );
}
