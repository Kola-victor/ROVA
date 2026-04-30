import { useEffect, useState } from 'react';
import { Scale, Download } from 'lucide-react';
import { supabase, type Transaction } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/format';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

type TrialBalanceLine = {
  account: string;
  type: string;
  debit: number;
  credit: number;
};

export default function TrialBalancePage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'ytd' | 'q1' | 'q2' | 'q3' | 'q4' | 'all'>('ytd');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase.from('transactions').select('*, category:categories(*)').eq('user_id', user!.id).order('date', { ascending: true });
    setTransactions(data || []);
    setLoading(false);
  }

  function filterByPeriod(txs: Transaction[]) {
    const now = new Date();
    const year = now.getFullYear();
    if (period === 'all') return txs;
    if (period === 'ytd') return txs.filter(t => new Date(t.date).getFullYear() === year);
    const quarters: Record<string, [number, number]> = { q1: [0, 2], q2: [3, 5], q3: [6, 8], q4: [9, 11] };
    const [start, end] = quarters[period];
    return txs.filter(t => {
      const m = new Date(t.date).getMonth();
      return new Date(t.date).getFullYear() === year && m >= start && m <= end;
    });
  }

  const filtered = filterByPeriod(transactions);
  const lines = buildTrialBalance(filtered);

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="mobile-p-4" style={{ padding: 24, maxWidth: 900, animation: 'fadeIn 0.3s ease' }}>
      <div className="mobile-col mobile-gap-4" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Trial Balance</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Verify that debits equal credits across all accounts</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['ytd', 'q1', 'q2', 'q3', 'q4', 'all'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{
                  padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
                  background: period === p ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: period === p ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${period === p ? 'var(--accent-primary)' : 'var(--bg-border)'}`,
                  transition: 'all 0.15s',
                }}>
                {p}
              </button>
            ))}
          </div>
          <Button variant="secondary" icon={<Download size={14} />}>Export</Button>
        </div>
      </div>

      <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Debits</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--success)' }}>{formatCurrency(totalDebit)}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Credits</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--error)' }}>{formatCurrency(totalCredit)}</div>
        </Card>
        <Card style={{ border: `1px solid ${isBalanced ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, background: isBalanced ? 'var(--success-dim)' : 'var(--error-dim)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scale size={16} color={isBalanced ? 'var(--success)' : 'var(--error)'} />
            <span style={{ fontSize: 16, fontWeight: 700, color: isBalanced ? 'var(--success)' : 'var(--error)' }}>
              {isBalanced ? 'Balanced' : 'Unbalanced'}
            </span>
          </div>
        </Card>
      </div>

      {loading ? (
        <div>{[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 6 }} />)}</div>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="mobile-table-container">
            <table className="transaction-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Debit</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={line.account} style={{ borderTop: i > 0 ? '1px solid var(--bg-border)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td className="mobile-tight-td" style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    <div className="mobile-desc-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{line.account}</div>
                  </td>
                  <td className="mobile-tight-td" style={{ padding: '10px 16px' }}>
                    <Badge variant={line.type === 'income' ? 'success' : line.type === 'expense' ? 'default' : 'info'}>{line.type}</Badge>
                  </td>
                  <td className="mobile-tight-td" style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, fontFamily: 'Space Grotesk, sans-serif', color: line.debit ? 'var(--success)' : 'var(--text-disabled)' }}>
                    {line.debit ? formatCurrency(line.debit) : '—'}
                  </td>
                  <td className="mobile-tight-td" style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, fontFamily: 'Space Grotesk, sans-serif', color: line.credit ? 'var(--error)' : 'var(--text-disabled)' }}>
                    {line.credit ? formatCurrency(line.credit) : '—'}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--bg-border)', background: 'var(--bg-elevated)' }}>
                <td className="mobile-tight-td" colSpan={2} style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>TOTALS</td>
                <td className="mobile-tight-td" style={{ padding: '12px 16px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: 'var(--success)', fontFamily: 'Space Grotesk, sans-serif' }}>{formatCurrency(totalDebit)}</td>
                <td className="mobile-tight-td" style={{ padding: '12px 16px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: 'var(--error)', fontFamily: 'Space Grotesk, sans-serif' }}>{formatCurrency(totalCredit)}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function buildTrialBalance(transactions: Transaction[]): TrialBalanceLine[] {
  const map = new Map<string, TrialBalanceLine>();

  transactions.forEach(tx => {
    const catName = (tx.category as any)?.name || 'Uncategorized';
    const accName = (tx.account as any)?.name || 'Cash';

    if (tx.type === 'income') {
      const cashLine = map.get(accName) || { account: accName, type: 'asset', debit: 0, credit: 0 };
      cashLine.debit += tx.amount;
      map.set(accName, cashLine);

      const incLine = map.get(catName) || { account: catName, type: 'income', debit: 0, credit: 0 };
      incLine.credit += tx.amount;
      map.set(catName, incLine);
    }

    if (tx.type === 'expense') {
      const expLine = map.get(catName) || { account: catName, type: 'expense', debit: 0, credit: 0 };
      expLine.debit += tx.amount;
      map.set(catName, expLine);

      const cashLine = map.get(accName) || { account: accName, type: 'asset', debit: 0, credit: 0 };
      cashLine.credit += tx.amount;
      map.set(accName, cashLine);
    }
  });

  const typeOrder = ['asset', 'liability', 'equity', 'income', 'expense'];
  return Array.from(map.values()).sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) || a.account.localeCompare(b.account));
}
