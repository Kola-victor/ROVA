import { useEffect, useState, type FormEvent } from 'react';
import { Sparkles, CheckCircle } from 'lucide-react';
import { supabase, type Account, type Category } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { autoClassify } from '../lib/categorise';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function QuickAddModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [autoSuggestion, setAutoSuggestion] = useState('');

  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    account_id: '',
  });

  useEffect(() => {
    if (open && user) {
      Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('categories').select('*').or(`user_id.eq.${user.id},is_system.eq.true`),
      ]).then(([accRes, catRes]) => {
        setAccounts(accRes.data || []);
        setCategories(catRes.data || []);
      });
    }
    if (!open) {
      setForm({ description: '', amount: '', type: 'expense', date: new Date().toISOString().split('T')[0], category_id: '', account_id: '' });
      setError('');
      setAutoSuggestion('');
      setSuccess(false);
    }
  }, [open, user]);

  function handleDescriptionChange(desc: string) {
    setForm(prev => {
      const updated = { ...prev, description: desc };
      if (desc.length >= 3) {
        const result = autoClassify(desc);
        if (result.categoryName) {
          const matched = categories.find(c =>
            c.name.toLowerCase() === result.categoryName.toLowerCase() &&
            (c.type === result.type || c.type === 'both')
          );
          setAutoSuggestion(result.categoryName);
          return { ...updated, type: result.type, category_id: matched ? matched.id : prev.category_id };
        }
      }
      setAutoSuggestion('');
      return updated;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('transactions').insert({
      user_id: user!.id,
      description: form.description,
      amount: Number(form.amount),
      type: form.type,
      date: form.date,
      category_id: form.category_id || null,
      account_id: form.account_id || null,
    });
    setSaving(false);
    if (err) { setError('Failed to save. Please try again.'); return; }
    setSuccess(true);
    setTimeout(() => { onClose(); }, 900);
  }

  const filteredCats = categories.filter(c => c.type === form.type || c.type === 'both');

  if (success) {
    return (
      <Modal open={open} onClose={onClose} title="Add Transaction" size="sm">
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <CheckCircle size={40} color="var(--success)" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Transaction saved!</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your transaction has been recorded.</div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Quick Add Transaction" size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Input
            label="Description"
            placeholder="e.g. Salary payment, MTN data, Office rent..."
            value={form.description}
            onChange={e => handleDescriptionChange(e.target.value)}
          />
          {autoSuggestion && (
            <div style={{
              marginTop: 6, padding: '7px 10px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
            }}>
              <Sparkles size={11} color="var(--accent-light)" />
              <span style={{ color: 'var(--text-muted)' }}>Auto-detected:</span>
              <strong style={{ color: 'var(--accent-light)', textTransform: 'capitalize' }}>{form.type}</strong>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span style={{ color: 'var(--text-secondary)' }}>{autoSuggestion}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(['income', 'expense'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setForm(p => ({ ...p, type: t, category_id: '' })); setAutoSuggestion(''); }}
              style={{
                flex: 1, padding: '9px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600,
                border: '1px solid',
                background: form.type === t ? (t === 'income' ? 'var(--success-dim)' : 'var(--error-dim)') : 'var(--bg-elevated)',
                color: form.type === t ? (t === 'income' ? 'var(--success)' : 'var(--error)') : 'var(--text-muted)',
                borderColor: form.type === t ? (t === 'income' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)') : 'var(--bg-border)',
                transition: 'all 0.15s', textTransform: 'capitalize',
              }}
            >
              {t === 'income' ? '↑ Income' : '↓ Expense'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input
            label="Amount (₦)"
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
            required
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Category</label>
            <select
              value={form.category_id}
              onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
              style={{
                padding: '9px 12px', background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-md)',
                color: form.category_id ? 'var(--text-primary)' : 'var(--text-muted)', outline: 'none',
              }}
            >
              <option value="">Select category...</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Account</label>
            <select
              value={form.account_id}
              onChange={e => setForm(p => ({ ...p, account_id: e.target.value }))}
              style={{
                padding: '9px 12px', background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-md)',
                color: form.account_id ? 'var(--text-primary)' : 'var(--text-muted)', outline: 'none',
              }}
            >
              <option value="">Account (optional)</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', background: 'var(--error-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--error)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} type="submit">Save Transaction</Button>
        </div>
      </form>
    </Modal>
  );
}
