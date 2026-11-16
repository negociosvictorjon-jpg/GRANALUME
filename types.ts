
export type Type = 'receita' | 'despesa';

export type Status = 'pago' | 'previsto';

export type Transaction = {
  id: string;
  type: Type;
  description: string;
  category: string;
  amountCents: string;
  occurrenceDate: string;
  dueDate: string;
  paymentDate: string;
  status: Status;
};

export type DebtInstallment = {
  id: string;
  number: number;
  dueDate: string;
  amountCents: string;
  paidDate: string;
};

export type Debt = {
  id: string;
  creditor: string;
  description: string;
  category: string;
  totalCents: string;
  firstDueDate: string;
  installments: DebtInstallment[];
  active: boolean;
};

export type View =
  | 'dashboard'
  | 'transactions'
  | 'income'
  | 'expenses'
  | 'debts'
  | 'goals'
  | 'budgets';
