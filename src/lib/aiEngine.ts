import { type Transaction, type Account } from './supabase';
import { formatCurrency } from './format';

export type Insight = {
  id: string;
  type: 'overspend' | 'drop' | 'opportunity' | 'summary' | 'warning' | 'positive';
  severity: 'info' | 'warning' | 'critical' | 'positive';
  title: string;
  body: string;
  icon: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function generateInsights(transactions: Transaction[], accounts: Account[]): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const thisMonthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const lastMonthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });

  const thisIncome = thisMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const thisExpense = thisMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lastIncome = lastMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const lastExpense = lastMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (thisIncome === 0 && thisExpense === 0) {
    insights.push({
      id: 'no-data',
      type: 'summary', severity: 'info',
      title: 'Add your first transaction',
      body: 'Start adding income and expense transactions to unlock AI-powered insights about your finances.',
      icon: '💡',
    });
    return insights;
  }

  if (lastIncome > 0 && thisIncome < lastIncome) {
    const drop = ((lastIncome - thisIncome) / lastIncome) * 100;
    insights.push({
      id: 'income-drop',
      type: 'drop', severity: drop > 30 ? 'critical' : 'warning',
      title: `Revenue dropped ${drop.toFixed(0)}% this month`,
      body: `Your income this month is ${formatCurrency(thisIncome)} vs ${formatCurrency(lastIncome)} last month. That's a drop of ${formatCurrency(lastIncome - thisIncome)}. Review your income sources.`,
      icon: '📉',
    });
  } else if (lastIncome > 0 && thisIncome > lastIncome) {
    const growth = ((thisIncome - lastIncome) / lastIncome) * 100;
    insights.push({
      id: 'income-growth',
      type: 'positive', severity: 'positive',
      title: `Revenue up ${growth.toFixed(0)}% this month`,
      body: `Great progress! You've earned ${formatCurrency(thisIncome)} this month, ${formatCurrency(thisIncome - lastIncome)} more than last month.`,
      icon: '📈',
    });
  }

  const catExpenses = new Map<string, { thisMonth: number; lastMonth: number }>();
  thisMonthTx.filter(t => t.type === 'expense').forEach(t => {
    const cat = (t.category as any)?.name || 'Uncategorized';
    const cur = catExpenses.get(cat) || { thisMonth: 0, lastMonth: 0 };
    cur.thisMonth += t.amount;
    catExpenses.set(cat, cur);
  });
  lastMonthTx.filter(t => t.type === 'expense').forEach(t => {
    const cat = (t.category as any)?.name || 'Uncategorized';
    const cur = catExpenses.get(cat) || { thisMonth: 0, lastMonth: 0 };
    cur.lastMonth += t.amount;
    catExpenses.set(cat, cur);
  });

  let biggestOverspend: { cat: string; pct: number; amount: number } | null = null;
  catExpenses.forEach(({ thisMonth: tm, lastMonth: lm }, cat) => {
    if (lm > 0 && tm > lm * 1.25) {
      const pct = ((tm - lm) / lm) * 100;
      if (!biggestOverspend || pct > biggestOverspend.pct) {
        biggestOverspend = { cat, pct, amount: tm };
      }
    }
  });

  if (biggestOverspend) {
    insights.push({
      id: 'overspend',
      type: 'overspend', severity: 'warning',
      title: `You're overspending on ${(biggestOverspend as any).cat}`,
      body: `Your ${(biggestOverspend as any).cat} spend is up ${(biggestOverspend as any).pct.toFixed(0)}% compared to last month, totalling ${formatCurrency((biggestOverspend as any).amount)}. Consider reviewing this category.`,
      icon: '⚠️',
    });
  }

  if (thisExpense > thisIncome && thisIncome > 0) {
    insights.push({
      id: 'negative-flow',
      type: 'warning', severity: 'critical',
      title: 'Spending exceeds income this month',
      body: `You're spending ${formatCurrency(thisExpense)} against ${formatCurrency(thisIncome)} in income. Your net is ${formatCurrency(thisIncome - thisExpense)}. Review non-essential expenses.`,
      icon: '🔴',
    });
  } else if (thisIncome > 0) {
    const net = thisIncome - thisExpense;
    const margin = (net / thisIncome) * 100;
    insights.push({
      id: 'net-flow',
      type: margin > 30 ? 'positive' : 'summary',
      severity: margin > 30 ? 'positive' : 'info',
      title: `Net profit margin: ${margin.toFixed(1)}%`,
      body: `This month you've kept ${formatCurrency(net)} after expenses — a ${margin.toFixed(1)}% profit margin. ${margin > 30 ? 'Excellent work!' : 'Aim for 30%+ for a healthy business.'}`,
      icon: margin > 30 ? '✅' : '📊',
    });
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const avgMonthlyExpense = lastExpense > 0 ? (thisExpense + lastExpense) / 2 : thisExpense;
  if (avgMonthlyExpense > 0 && totalBalance < avgMonthlyExpense * 2) {
    insights.push({
      id: 'low-runway',
      type: 'warning', severity: 'warning',
      title: 'Low cash runway — under 2 months',
      body: `Your current balance of ${formatCurrency(totalBalance)} covers less than 2 months of expenses at your current burn rate of ${formatCurrency(avgMonthlyExpense)}/month.`,
      icon: '🔋',
    });
  }

  const allExpenses = transactions.filter(t => t.type === 'expense');
  const totalCatMap = new Map<string, number>();
  allExpenses.forEach(t => {
    const cat = (t.category as any)?.name || 'Uncategorized';
    totalCatMap.set(cat, (totalCatMap.get(cat) || 0) + t.amount);
  });
  const sortedCats = Array.from(totalCatMap.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0) {
    const [topCat, topAmount] = sortedCats[0];
    const total = allExpenses.reduce((s, t) => s + t.amount, 0);
    const pct = total > 0 ? (topAmount / total) * 100 : 0;
    if (pct > 40) {
      insights.push({
        id: 'top-category',
        type: 'opportunity', severity: 'info',
        title: `${topCat} is your biggest cost`,
        body: `${topCat} accounts for ${pct.toFixed(0)}% of all your expenses (${formatCurrency(topAmount)}). Explore ways to optimise this category.`,
        icon: '🔍',
      });
    }
  }

  return insights;
}

export function answerQuestion(
  question: string,
  transactions: Transaction[],
  accounts: Account[],
  isStaff: boolean = false
): string {
  const q = question.toLowerCase();
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const thisMonthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const lastMonthTx = transactions.filter(t => {
    const d = new Date(t.date);
    const lm = thisMonth === 0 ? 11 : thisMonth - 1;
    const ly = thisMonth === 0 ? thisYear - 1 : thisYear;
    return d.getMonth() === lm && d.getFullYear() === ly;
  });

  const thisIncome = thisMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const thisExpense = thisMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lastIncome = lastMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const allIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const allExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (q.includes('make') && (q.includes('last month') || q.includes('earn'))) {
    if (lastIncome === 0) return `No income was recorded last month. Make sure to log your revenue transactions.`;
    return `Last month you earned ${formatCurrency(lastIncome)} in total income.`;
  }

  if ((q.includes('make') || q.includes('earn') || q.includes('income') || q.includes('revenue')) && q.includes('this month')) {
    return `This month you've earned ${formatCurrency(thisIncome)} in income. Your expenses are ${formatCurrency(thisExpense)}, giving you a net of ${formatCurrency(thisIncome - thisExpense)}.`;
  }

  if (q.includes('owe') || q.includes('who owes') || q.includes('receivable')) {
    const invoiceHint = `I track income and expense transactions, but not individual debtors. Check your Invoices page for outstanding payments owed to you.`;
    return invoiceHint;
  }

  if (q.includes('afford') || q.includes('hire')) {
    const net = allIncome - allExpense;
    if (net <= 0) {
      return `Based on your records, your total expenses exceed income by ${formatCurrency(Math.abs(net))}. Hiring would add more financial pressure. Focus on increasing revenue or cutting costs first.`;
    }
    const monthlyNet = thisIncome - thisExpense;
    if (monthlyNet > 50000) {
      return `This month your net is ${formatCurrency(monthlyNet)}. You may have room to hire, but I'd recommend keeping at least 3 months of the new salary as cash reserve before committing.`;
    }
    return `Your current monthly net is ${formatCurrency(monthlyNet)}. To hire comfortably, aim for a monthly surplus of at least 2–3× the intended salary before making the commitment.`;
  }

  if (q.includes('balance') || q.includes('how much') && q.includes('account')) {
    if (accounts.length === 0) return `No accounts found. Add your bank and wallet accounts in Settings.`;
    const lines = accounts.map(a => `• ${a.name}: ${formatCurrency(a.balance)}`).join('\n');
    return `Your total balance is ${formatCurrency(totalBalance)}.\n\n${lines}`;
  }

  if (q.includes('overspend') || q.includes('spending too much')) {
    const catMap = new Map<string, number>();
    thisMonthTx.filter(t => t.type === 'expense').forEach(t => {
      const cat = (t.category as any)?.name || 'Uncategorized';
      catMap.set(cat, (catMap.get(cat) || 0) + t.amount);
    });
    if (catMap.size === 0) return `No expenses recorded this month yet.`;
    const top = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return `Your top expense categories this month:\n${top.map(([c, v]) => `• ${c}: ${formatCurrency(v)}`).join('\n')}\n\nTotal spent: ${formatCurrency(thisExpense)}.`;
  }

  if (q.includes('profit') || q.includes('net') || q.includes('margin')) {
    if (isStaff) return "I can only assist with transactions and dashboard metrics. For financial summaries like profit and margins, please consult your admin.";
    const margin = thisIncome > 0 ? ((thisIncome - thisExpense) / thisIncome * 100) : 0;
    return `This month: Income ${formatCurrency(thisIncome)}, Expenses ${formatCurrency(thisExpense)}, Net ${formatCurrency(thisIncome - thisExpense)} (${margin.toFixed(1)}% margin).`;
  }

  if (q.includes('summary') || q.includes('overview')) {
    if (isStaff) return "I cannot provide overall financial summaries. I can only assist you with specific transactions or basic dashboard insights.";
    return `Here's your financial summary:\n\n• This month income: ${formatCurrency(thisIncome)}\n• This month expenses: ${formatCurrency(thisExpense)}\n• Net this month: ${formatCurrency(thisIncome - thisExpense)}\n• Total balance (all accounts): ${formatCurrency(totalBalance)}\n• All-time income: ${formatCurrency(allIncome)}\n• All-time expenses: ${formatCurrency(allExpense)}`;
  }

  if (q.includes('best') || q.includes('top') && q.includes('month')) {
    if (isStaff) return "Sorry, I cannot share historical income comparisons. I am restricted to transaction queries.";
    const byMonth = new Map<string, number>();
    transactions.filter(t => t.type === 'income').forEach(t => {
      const d = new Date(t.date);
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      byMonth.set(key, (byMonth.get(key) || 0) + t.amount);
    });
    if (byMonth.size === 0) return `No income recorded yet.`;
    const sorted = Array.from(byMonth.entries()).sort((a, b) => b[1] - a[1]);
    return `Your best income month was ${sorted[0][0]} with ${formatCurrency(sorted[0][1])}.`;
  }

  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good evening'];
  if (greetings.some(g => q.startsWith(g))) {
    if (isStaff) return `Hello! I'm your ROVA financial assistant. You can ask me about recent transactions, invoices, or specific categories.`;
    return `Hello! I'm your ROVA financial assistant. Ask me things like:\n• "How much did I make this month?"\n• "What am I overspending on?"\n• "Can I afford to hire someone?"\n• "Give me a financial summary"`;
  }

  if (q.includes('tax') || q.includes('audit')) {
    if (isStaff) return "I am not authorized to discuss tax or audit-related information.";
    return "I can help you review your expenses to prepare for tax season. Try asking for an expense breakdown.";
  }

  if (isStaff) {
    return `I can help you find transactions and check spending in specific categories. Try asking about a specific transaction or category.`;
  }

  return `I can answer questions about your income, expenses, balances, and financial health. Try asking:\n• "How much did I make last month?"\n• "What's my profit margin?"\n• "What's my total balance?"\n• "Can I afford to hire someone?"`;
}
