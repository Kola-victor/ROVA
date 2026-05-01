import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type Transaction } from '../../lib/supabase';
import { formatCurrency } from '../../lib/format';
import { downloadCSV, printStatementHTML } from '../../lib/export';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Download, Printer, TrendingUp, TrendingDown, DollarSign, ChevronDown } from 'lucide-react';

export default function ProfitLossPage() {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase.from('transactions').select('*, category:categories(*)').eq('user_id', user!.id).order('date');
    setTransactions(data || []);
    setLoading(false);
  }

  const periodTx = transactions.filter(t => new Date(t.date).getFullYear() === year);
  const incomeByCategory = buildCategoryMap(periodTx.filter(t => t.type === 'income'));
  const expenseByCategory = buildCategoryMap(periodTx.filter(t => t.type === 'expense'));
  const totalRevenue = Object.values(incomeByCategory).reduce((s, v) => s + v, 0);
  const totalExpenses = Object.values(expenseByCategory).reduce((s, v) => s + v, 0);
  const grossProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const availableYears = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a);
  const businessName = profile?.business_name || profile?.full_name || 'My Business';

  function handleExportCSV() {
    const rows: (string | number)[][] = [];
    rows.push(['REVENUE', '', '']);
    Object.entries(incomeByCategory).forEach(([name, amount]) => rows.push(['', name, amount]));
    rows.push(['Total Revenue', '', totalRevenue]);
    rows.push(['', '', '']);
    rows.push(['OPERATING EXPENSES', '', '']);
    Object.entries(expenseByCategory).forEach(([name, amount]) => rows.push(['', name, amount]));
    rows.push(['Total Expenses', '', totalExpenses]);
    rows.push(['', '', '']);
    rows.push([grossProfit >= 0 ? 'NET PROFIT' : 'NET LOSS', '', grossProfit]);
    rows.push(['Profit Margin', '', `${profitMargin.toFixed(1)}%`]);
    downloadCSV(`profit-loss-${year}.csv`, ['Section', 'Category', 'Amount (NGN)'], rows);
    setShowExportMenu(false);
  }

  function handlePrint() {
    const incomeRows = Object.entries(incomeByCategory).map(([name, amt]) =>
      `<tr class="line-row"><td>${name}</td><td class="amount positive">${formatCurrency(amt)}</td></tr>`).join('');
    const expenseRows = Object.entries(expenseByCategory).map(([name, amt]) =>
      `<tr class="line-row"><td>${name}</td><td class="amount negative">${formatCurrency(amt)}</td></tr>`).join('');

    const html = `<table>
      <tr class="section-header"><td colspan="2">Revenue</td></tr>
      ${incomeRows}
      <tr class="subtotal-row"><td>Total Revenue</td><td class="amount positive">${formatCurrency(totalRevenue)}</td></tr>
      <tr class="section-header"><td colspan="2">Operating Expenses</td></tr>
      ${expenseRows}
      <tr class="subtotal-row"><td>Total Expenses</td><td class="amount negative">${formatCurrency(totalExpenses)}</td></tr>
      <tr class="total-row"><td>Net ${grossProfit >= 0 ? 'Profit' : 'Loss'} &nbsp;<span style="font-size:11px;font-weight:400;color:#6b7280">Margin: ${profitMargin.toFixed(1)}%</span></td>
        <td class="amount ${grossProfit >= 0 ? 'positive' : 'negative'}">${grossProfit < 0 ? '-' : ''}${formatCurrency(Math.abs(grossProfit))}</td></tr>
    </table>`;
    printStatementHTML('Profit & Loss Statement', `January 1 – December 31, ${year}`, businessName, html);
    setShowExportMenu(false);
  }

  return (
    <div className="mobile-p-4" style={{ padding: 24, maxWidth: 800, animation: 'fadeIn 0.3s ease' }}>
      <div className="mobile-col mobile-gap-4" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Profit & Loss Statement</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Income statement for the selected period</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}>
            {(availableYears.length > 0 ? availableYears : [new Date().getFullYear()]).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ position: 'relative' }}>
            <Button variant="secondary" icon={<Download size={14} />} onClick={() => setShowExportMenu(v => !v)}>
              Export <ChevronDown size={11} style={{ marginLeft: 2 }} />
            </Button>
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 100, minWidth: 160, overflow: 'hidden' }}>
                <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <Download size={13} color="var(--text-muted)" /> Export CSV
                </button>
                <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', transition: 'background 0.1s', borderTop: '1px solid var(--bg-border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <Printer size={13} color="var(--text-muted)" /> Print / PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mobile-grid-1 mobile-gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'var(--success)', icon: TrendingUp },
          { label: 'Total Expenses', value: formatCurrency(totalExpenses), color: 'var(--error)', icon: TrendingDown },
          { label: 'Net Profit', value: formatCurrency(Math.abs(grossProfit)), color: grossProfit >= 0 ? 'var(--success)' : 'var(--error)', icon: DollarSign },
        ].map(s => (
          <Card key={s.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <s.icon size={14} color={s.color} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
            </div>
            <div className="mobile-stat-value" style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {loading ? (
        <div>{[1,2].map(i => <div key={i} className="skeleton" style={{ height: 200, marginBottom: 16 }} />)}</div>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-border)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{businessName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Income Statement · January 1 – December 31, {year}</div>
          </div>

          <div>
            <Section title="Revenue" items={incomeByCategory} total={totalRevenue} color="var(--success)" />
            <div style={{ borderTop: '1px solid var(--bg-border)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Gross Profit</span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: totalRevenue >= totalExpenses ? 'var(--success)' : 'var(--error)' }}>
                {formatCurrency(Math.abs(totalRevenue))}
              </span>
            </div>
            <Section title="Operating Expenses" items={expenseByCategory} total={totalExpenses} color="var(--error)" />
            <div style={{ borderTop: '2px solid var(--bg-border)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Net {grossProfit >= 0 ? 'Profit' : 'Loss'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Profit Margin: {profitMargin.toFixed(1)}%</div>
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif', color: grossProfit >= 0 ? 'var(--success)' : 'var(--error)', alignSelf: 'center' }}>
                {grossProfit < 0 ? '-' : ''}{formatCurrency(Math.abs(grossProfit))}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Section({ title, items, total, color }: { title: string; items: Record<string, number>; total: number; color: string }) {
  return (
    <div>
      <div style={{ padding: '10px 20px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--bg-border)' }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>{title}</span>
      </div>
      {Object.entries(items).map(([name, amount]) => (
        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 20px 9px 32px', borderTop: '1px solid var(--bg-border)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{name}</span>
          <span style={{ fontSize: 13, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-secondary)' }}>{formatCurrency(amount)}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderTop: '1px solid var(--bg-border)', background: 'rgba(0,0,0,0.02)' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Total {title}</span>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color }}>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function buildCategoryMap(txs: Transaction[]): Record<string, number> {
  const map: Record<string, number> = {};
  txs.forEach(t => {
    const cat = (t.category as any)?.name || 'Uncategorized';
    map[cat] = (map[cat] || 0) + t.amount;
  });
  return Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]));
}
