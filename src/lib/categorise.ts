export type AutoResult = { type: 'income' | 'expense'; categoryName: string };

const INCOME_KEYWORDS: { keywords: string[]; category: string }[] = [
  { keywords: ['invoice payment', 'revenue', 'sales', 'turnover', 'client payment', 'customer payment', 'business income'], category: 'Business Revenue' },
  { keywords: ['freelance', 'contract', 'gig', 'project fee', 'consulting fee', 'consultancy', 'service fee', 'services rendered'], category: 'Service Revenue' },
  { keywords: ['dividend', 'interest', 'investment return', 'yield', 'return on', 'staking', 'profit from'], category: 'Investment' },
  { keywords: ['transfer in', 'received', 'credit alert', 'inflow', 'deposit', 'lodgement', 'capital injection'], category: 'Transfer' },
  { keywords: ['refund', 'reimbursement', 'reversal', 'cashback', 'rebate'], category: 'Refund' },
  { keywords: ['grant', 'loan received', 'loan disbursement', 'bursary', 'scholarship', 'award', 'funding', 'investment received'], category: 'Other Income' },
];

const EXPENSE_KEYWORDS: { keywords: string[]; category: string }[] = [
  { keywords: ['rent', 'lease', 'landlord', 'property', 'office space', 'shop rent', 'store rent', 'apartment'], category: 'Rent & Housing' },
  { keywords: ['food', 'meal', 'restaurant', 'suya', 'buka', 'bukka', 'cafeteria', 'lunch', 'dinner', 'breakfast', 'snack', 'eatery', 'fast food', 'chicken republic', 'mr biggs', 'tantalizers', 'dominos', 'shoprite food', 'grocery', 'market'], category: 'Food & Dining' },
  { keywords: ['uber', 'bolt', 'taxify', 'fuel', 'petrol', 'diesel', 'keke', 'okada', 'danfo', 'bus fare', 'transport', 'logistics', 'delivery', 'dispatch', 'vehicle', 'car wash', 'parking', 'toll', 'flight', 'travel', 'airfare'], category: 'Transportation' },
  { keywords: ['nepa', 'phcn', 'electricity', 'power bill', 'ekedc', 'ibedc', 'kedco', 'mtn', 'airtel', 'glo', 'etisalat', '9mobile', 'data', 'recharge', 'airtime', 'internet', 'broadband', 'spectranet', 'swift', 'smile'], category: 'Utilities' },
  { keywords: ['hospital', 'clinic', 'pharmacy', 'drugs', 'medicine', 'health', 'doctor', 'medical', 'lab test', 'nhis'], category: 'Health & Medical' },
  { keywords: ['laptop', 'computer', 'phone', 'mobile', 'equipment', 'machinery', 'tools', 'gadget', 'appliance', 'printer', 'monitor'], category: 'Equipment' },
  { keywords: ['salary', 'salari', 'wage', 'payslip', 'payroll', 'monthly pay', 'staff pay', 'salary paid', 'staff salary', 'wages paid', 'payroll expense', 'employee payment', 'worker pay', 'allowance', 'stipend'], category: 'Payroll' },
  { keywords: ['tax payment', 'vat remittance', 'paye remittance', 'firs', 'lirs', 'tax remit', 'stamp duty payment'], category: 'Taxes & Duties' },
  { keywords: ['marketing', 'advertising', 'advert', 'promotion', 'flyer', 'banner', 'social media ads', 'google ads', 'meta ads', 'facebook ads'], category: 'Marketing' },
  { keywords: ['software', 'subscription', 'saas', 'license', 'hosting', 'domain', 'cloud', 'app subscription', 'platform fee'], category: 'Software & Subscriptions' },
  { keywords: ['bank charge', 'transfer fee', 'maintenance fee', 'sms charge', 'card fee', 'atm', 'bank debit', 'transaction charge'], category: 'Bank Charges' },
  { keywords: ['stationery', 'office supplies', 'printing', 'paper', 'pen', 'toner'], category: 'Office Supplies' },
  { keywords: ['loan repayment', 'loan payment', 'debt repayment', 'mortgage', 'credit repayment'], category: 'Loan Repayment' },
  { keywords: ['withdrawal', 'cash out', 'transfer out', 'sent to', 'payment to', 'purchase'], category: 'Other Expense' },
];

export function autoClassify(description: string): AutoResult {
  const lower = description.toLowerCase().trim();

  for (const { keywords, category } of INCOME_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) {
      return { type: 'income', categoryName: category };
    }
  }

  for (const { keywords, category } of EXPENSE_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) {
      return { type: 'expense', categoryName: category };
    }
  }

  return { type: 'expense', categoryName: '' };
}
