import { useEffect, useMemo, useState } from 'react';
import type {
  Debt,
  DebtInstallment,
  Status,
  Transaction,
  Type,
  View,
} from './core/types';
import { formatMoney, parseMoney } from './core/money';
import {
  daysInMonth,
  installmentDate,
  isDateInRange,
  localDate,
  monthOf,
  transactionDate,
  type DateRange,
} from './core/dates';
import './App.css';


const STORAGE_KEY = 'granalume.transactions.v1';
const DEBTS_STORAGE_KEY = 'granalume.debts.v1';

const menu: { id: View; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '◫', label: 'Visão geral' },
  { id: 'transactions', icon: '⇄', label: 'Lançamentos' },
  { id: 'income', icon: '↗', label: 'Receitas' },
  { id: 'expenses', icon: '↙', label: 'Despesas' },
  { id: 'debts', icon: '▤', label: 'Dívidas' },
  { id: 'goals', icon: '◎', label: 'Metas financeiras' },
  { id: 'budgets', icon: '▥', label: 'Orçamentos' },
];

const categories: Record<Type, string[]> = {
  receita: [
    'Salário',
    'Serviços',
    'Vendas',
    'Freelance',
    'Investimentos',
    'Outras receitas',
  ],
  despesa: [
    'Moradia',
    'Alimentação',
    'Transporte',
    'Saúde',
    'Educação',
    'Lazer',
    'Contas',
    'Outras despesas',
  ],
};

const categoryVisuals: Record<
  string,
  { icon: string; color: string; background: string }
> = {
  Moradia: { icon: '🏠', color: '#20A464', background: '#E5F7EC' },
  Alimentação: { icon: '🛒', color: '#E6A23C', background: '#FFF3DD' },
  Transporte: { icon: '🚗', color: '#5285D5', background: '#EAF1FF' },
  Saúde: { icon: '❤️', color: '#D76F7B', background: '#FCECEF' },
  Educação: { icon: '📚', color: '#8C78C6', background: '#F0ECFA' },
  Lazer: { icon: '🎉', color: '#D78B48', background: '#FFF0E2' },
  Contas: { icon: '💡', color: '#3EAAA4', background: '#E6F6F4' },
  'Outras despesas': { icon: '📦', color: '#84938B', background: '#EDF1EE' },
  Salário: { icon: '💼', color: '#20A464', background: '#E5F7EC' },
  Serviços: { icon: '🧰', color: '#5285D5', background: '#EAF1FF' },
  Vendas: { icon: '🛍️', color: '#D78B48', background: '#FFF0E2' },
  Freelance: { icon: '💻', color: '#8C78C6', background: '#F0ECFA' },
  Investimentos: { icon: '📈', color: '#3EAAA4', background: '#E6F6F4' },
  'Outras receitas': { icon: '💰', color: '#84938B', background: '#EDF1EE' },
};

function categoryVisual(category: string) {
  return (
    categoryVisuals[category] ?? {
      icon: '📌',
      color: '#84938B',
      background: '#EDF1EE',
    }
  );
}



function emptyForm(type: Type = 'despesa') {
  const today = localDate();
  return {
    type,
    description: '',
    category: categories[type][0],
    amount: '',
    occurrenceDate: today,
    dueDate: today,
    paymentDate: today,
    status: 'pago' as Status,
  };
}

function loadTransactions(): Transaction[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadDebts(): Debt[] {
  try {
    const saved = localStorage.getItem(DEBTS_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


function App() {
  const [active, setActive] = useState<View>('dashboard');
  const [transactions, setTransactions] =
    useState<Transaction[]>(loadTransactions);
  const [debts, setDebts] = useState<Debt[]>(loadDebts);
  const [debtFormOpen, setDebtFormOpen] = useState(false);
  const [debtError, setDebtError] = useState('');
  const [debtForm, setDebtForm] = useState({
    creditor: '',
    description: '',
    category: 'Outras despesas',
    total: '',
    installmentCount: '1',
    firstDueDate: localDate(),
  });
  const [periodMode, setPeriodMode] = useState<'monthly' | 'yearly' | 'custom'>('monthly');
  const [period, setPeriod] = useState(monthOf(localDate()));
  const [selectedYear, setSelectedYear] = useState(localDate().slice(0, 4));
  const [customStart, setCustomStart] = useState(`${localDate().slice(0, 7)}-01`);
  const [customEnd, setCustomEnd] = useState(localDate());
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todos' | Status>('todos');
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('granalume.theme.v1') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('granalume.theme.v1', darkMode ? 'dark' : 'light');
    } catch {
      // A preferência visual continua funcionando mesmo se o armazenamento estiver indisponível.
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(DEBTS_STORAGE_KEY, JSON.stringify(debts));
  }, [debts]);

  const current = menu.find((item) => item.id === active);

  const selectedRange: DateRange = useMemo(() => {
    if (periodMode === 'yearly') {
      return { start: `${selectedYear}-01-01`, end: `${selectedYear}-12-31` };
    }
    if (periodMode === 'custom') {
      return { start: customStart, end: customEnd };
    }
    const [year, month] = period.split('-').map(Number);
    return {
      start: `${period}-01`,
      end: `${period}-${String(daysInMonth(year, month)).padStart(2, '0')}`,
    };
  }, [periodMode, period, selectedYear, customStart, customEnd]);

  const customPeriodInvalid =
    periodMode === 'custom' &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(customStart) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(customEnd) ||
      customStart > customEnd);

  const effectiveRange = customPeriodInvalid
    ? { start: '9999-12-31', end: '0000-01-01' }
    : selectedRange;

  const periodTransactions = useMemo(
    () =>
      transactions.filter((tx) =>
        isDateInRange(transactionDate(tx), effectiveRange)
      ),
    [transactions, effectiveRange]
  );

  const received = periodTransactions
    .filter((tx) => tx.type === 'receita' && tx.status === 'pago')
    .reduce((sum, tx) => sum + BigInt(tx.amountCents), 0n);

  // Parcelas pagas usam a data do pagamento; pendentes usam o vencimento.
  const debtPaidInstallments = debts.flatMap((debt) =>
    debt.installments
      .filter(
        (installment) =>
          installment.paidDate &&
          isDateInRange(installment.paidDate, effectiveRange)
      )
      .map((installment) => ({
        category: debt.category,
        amountCents: installment.amountCents,
      }))
  );

  const debtPendingInstallments = debts.flatMap((debt) =>
    debt.installments
      .filter(
        (installment) =>
          !installment.paidDate &&
          isDateInRange(installment.dueDate, effectiveRange)
      )
      .map((installment) => ({
        category: debt.category,
        amountCents: installment.amountCents,
      }))
  );

  const paidExpenses =
    periodTransactions
      .filter((tx) => tx.type === 'despesa' && tx.status === 'pago')
      .reduce((sum, tx) => sum + BigInt(tx.amountCents), 0n) +
    debtPaidInstallments.reduce(
      (sum, installment) => sum + BigInt(installment.amountCents),
      0n
    );

  const expensesByCategory = useMemo(() => {
    const totals = new Map<string, bigint>();

    periodTransactions.forEach((tx) => {
      if (tx.type === 'despesa' && tx.status === 'pago') {
        const current = totals.get(tx.category) ?? 0n;
        totals.set(tx.category, current + BigInt(tx.amountCents));
      }
    });

    debts.forEach((debt) => {
      debt.installments.forEach((installment) => {
        if (
          installment.paidDate &&
          isDateInRange(installment.paidDate, effectiveRange)
        ) {
          const current = totals.get(debt.category) ?? 0n;
          totals.set(debt.category, current + BigInt(installment.amountCents));
        }
      });
    });

    return Array.from(totals.entries())
      .map(([name, value]) => ({
        name,
        value,
        visual: categoryVisual(name),
      }))
      .sort((a, b) => (a.value > b.value ? -1 : a.value < b.value ? 1 : 0));
  }, [periodTransactions, debts, effectiveRange]);

  const expenseDonut = useMemo(() => {
    if (expensesByCategory.length === 0) {
      return 'conic-gradient(#E8EEE9 0% 100%)';
    }

    const total = expensesByCategory.reduce(
      (sum, item) => sum + item.value,
      0n
    );

    let cursor = 0;

    const slices = expensesByCategory.map((item, index) => {
      const percentage = Number((item.value * 10000n) / total) / 100;
      const end =
        index === expensesByCategory.length - 1
          ? 100
          : Math.min(100, cursor + percentage);

      const slice = `${item.visual.color} ${cursor}% ${end}%`;
      cursor = end;
      return slice;
    });

    return `conic-gradient(${slices.join(', ')})`;
  }, [expensesByCategory]);

  const pendingExpenses =
    periodTransactions
      .filter((tx) => tx.type === 'despesa' && tx.status === 'previsto')
      .reduce((sum, tx) => sum + BigInt(tx.amountCents), 0n) +
    debtPendingInstallments.reduce(
      (sum, installment) => sum + BigInt(installment.amountCents),
      0n
    );

  const plannedIncome = periodTransactions
    .filter((tx) => tx.type === 'receita' && tx.status === 'previsto')
    .reduce((sum, tx) => sum + BigInt(tx.amountCents), 0n);

  const balance = received - paidExpenses;
  const canSpend =
    balance - pendingExpenses > 0n ? balance - pendingExpenses : 0n;

  const comparisonBase = received > paidExpenses ? received : paidExpenses;
  const incomeWidth =
    comparisonBase === 0n ? 0 : Number((received * 100n) / comparisonBase);
  const expenseWidth =
    comparisonBase === 0n ? 0 : Number((paidExpenses * 100n) / comparisonBase);

  const visibleTransactions = transactions
    .filter((tx) => isDateInRange(transactionDate(tx), effectiveRange))
    .filter((tx) => {
      if (active === 'income' && tx.type !== 'receita') return false;
      if (active === 'expenses' && tx.type !== 'despesa') return false;
      if (filter !== 'todos' && tx.status !== filter) return false;
      return true;
    })
    .sort((a, b) => b.occurrenceDate.localeCompare(a.occurrenceDate));

  function openNew(type: Type = active === 'income' ? 'receita' : 'despesa') {
    setEditingId(null);
    setForm(emptyForm(type));
    setError('');
    setFormOpen(true);
  }

  function openEdit(tx: Transaction) {
    setActive('transactions');
    setEditingId(tx.id);

    setForm({
      type: tx.type,
      description: tx.description,
      category: tx.category,
      amount: formatMoney(BigInt(tx.amountCents)).replace('R$ ', ''),
      occurrenceDate: tx.occurrenceDate,
      dueDate: tx.dueDate,
      paymentDate: tx.paymentDate,
      status: tx.status,
    });

    setError('');
    setFormOpen(true);
  }

  function saveTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const amount = parseMoney(form.amount);
    if (amount === null) {
      setError('Informe um valor válido. Exemplo: 150,50.');
      return;
    }
    if (!form.description.trim()) {
      setError('Informe uma descrição.');
      return;
    }
    if (!form.occurrenceDate) {
      setError('Informe a data da ocorrência.');
      return;
    }
    if (form.status === 'previsto' && !form.dueDate) {
      setError('Informe a data de vencimento.');
      return;
    }
    if (form.status === 'pago' && !form.paymentDate) {
      setError('Informe a data do pagamento ou recebimento.');
      return;
    }

    const transaction: Transaction = {
      id: editingId || crypto.randomUUID(),
      type: form.type,
      description: form.description.trim(),
      category: form.category,
      amountCents: amount.toString(),
      occurrenceDate: form.occurrenceDate,
      dueDate: form.dueDate,
      paymentDate: form.status === 'pago' ? form.paymentDate : '',
      status: form.status,
    };

    setTransactions((previous) =>
      editingId
        ? previous.map((tx) => (tx.id === editingId ? transaction : tx))
        : [...previous, transaction]
    );

    setFormOpen(false);
    setEditingId(null);
  }

  function deleteTransaction(id: string) {
    if (!window.confirm('Tem certeza de que deseja excluir este lançamento?')) {
      return;
    }
    setTransactions((previous) => previous.filter((tx) => tx.id !== id));
  }

  function changeType(type: Type) {
    setForm((previous) => ({
      ...previous,
      type,
      category: categories[type][0],
    }));
  }

  function saveDebt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDebtError('');

    const total = parseMoney(debtForm.total);
    const count = Number(debtForm.installmentCount);

    if (!debtForm.creditor.trim()) {
      setDebtError('Informe o nome do credor ou da instituição.');
      return;
    }
    if (!debtForm.description.trim()) {
      setDebtError('Informe uma descrição para a dívida.');
      return;
    }
    if (total === null) {
      setDebtError('Informe um valor total válido. Exemplo: 1.250,00.');
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 120) {
      setDebtError('A quantidade de parcelas deve ficar entre 1 e 120.');
      return;
    }
    if (!debtForm.firstDueDate) {
      setDebtError('Informe a data do primeiro vencimento.');
      return;
    }

    const baseAmount = total / BigInt(count);
    const remainder = total % BigInt(count);
    const installments: DebtInstallment[] = Array.from(
      { length: count },
      (_, index) => ({
        id: crypto.randomUUID(),
        number: index + 1,
        dueDate: installmentDate(debtForm.firstDueDate, index),
        amountCents: (
          baseAmount + (BigInt(index) < remainder ? 1n : 0n)
        ).toString(),
        paidDate: '',
      })
    );

    const newDebt: Debt = {
      id: crypto.randomUUID(),
      creditor: debtForm.creditor.trim(),
      description: debtForm.description.trim(),
      category: debtForm.category,
      totalCents: total.toString(),
      firstDueDate: debtForm.firstDueDate,
      installments,
      active: true,
    };

    setDebts((previous) => [newDebt, ...previous]);
    setDebtForm({
      creditor: '',
      description: '',
      category: 'Outras despesas',
      total: '',
      installmentCount: '1',
      firstDueDate: localDate(),
    });
    setDebtFormOpen(false);
  }

  function toggleInstallment(debtId: string, installmentId: string) {
    setDebts((previous) =>
      previous.map((debt) =>
        debt.id !== debtId
          ? debt
          : {
              ...debt,
              installments: debt.installments.map((installment) =>
                installment.id !== installmentId
                  ? installment
                  : {
                      ...installment,
                      paidDate: installment.paidDate ? '' : localDate(),
                    }
              ),
            }
      )
    );
  }

  const periodLabel =
    periodMode === 'yearly'
      ? selectedYear
      : periodMode === 'custom'
        ? customPeriodInvalid
          ? 'Período personalizado inválido'
          : `${new Date(`${customStart}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${customEnd}T12:00:00`).toLocaleDateString('pt-BR')}`
        : new Intl.DateTimeFormat('pt-BR', {
            month: 'long',
            year: 'numeric',
          }).format(new Date(`${period}-15T12:00:00`));

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">G</div>
          <div>
            <strong>GRANALUME</strong>
            <small>CONTROLE FINANCEIRO</small>
          </div>
        </div>

        <div className="menu-label">MENU PRINCIPAL</div>
        <nav>
          {menu.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => {
                setActive(item.id);
                setFormOpen(false);
                setFilter('todos');
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span>✦</span>
            <strong>Seu futuro começa agora.</strong>
            <p>Pequenos passos constroem grandes conquistas.</p>
          </div>
          <div className="profile">
            <div className="avatar">U</div>
            <div>
              <strong>Minha conta</strong>
              <small>Perfil pessoal</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">Início / {current?.label}</div>
          <div className="top-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setDarkMode((currentMode) => !currentMode)}
              aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              <span aria-hidden="true">{darkMode ? '☀' : '☾'}</span>
              <span>{darkMode ? 'Modo claro' : 'Modo escuro'}</span>
            </button>
            <span className="status">
              <i /> Dados salvos neste navegador
            </span>
          </div>
        </header>

        <section className="content">
          <div className="welcome">
            <div>
              <span className="eyebrow">SEU CONTROLE FINANCEIRO</span>
              <h1>{current?.label}</h1>
              <p>Organize seu dinheiro e acompanhe sua evolução.</p>
            </div>
            <div className="period-controls">
              <label className="period-mode-label">
                <span>Período</span>
                <select
                  aria-label="Tipo de período"
                  value={periodMode}
                  onChange={(event) =>
                    setPeriodMode(event.target.value as 'monthly' | 'yearly' | 'custom')
                  }
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                  <option value="custom">Personalizado</option>
                </select>
              </label>
              {periodMode === 'monthly' && (
                <label className="period-value-label">
                  <span>Mês de referência</span>
                  <input
                    type="month"
                    aria-label="Selecionar mês e ano"
                    value={period}
                    onChange={(event) => {
                      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) {
                        setPeriod(event.target.value);
                      }
                    }}
                  />
                </label>
              )}
              {periodMode === 'yearly' && (
                <label className="period-value-label">
                  <span>Ano de referência</span>
                  <select
                    aria-label="Selecionar ano"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                  >
                    {Array.from(
                      { length: 21 },
                      (_, index) => String(Number(localDate().slice(0, 4)) - 10 + index)
                    ).map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </label>
              )}
              {periodMode === 'custom' && (
                <div className="period-custom-fields">
                  <label className="period-value-label">
                    <span>Data inicial</span>
                    <input
                      type="date"
                      aria-label="Data inicial"
                      value={customStart}
                      max={customEnd || undefined}
                      onChange={(event) => setCustomStart(event.target.value)}
                    />
                  </label>
                  <label className="period-value-label">
                    <span>Data final</span>
                    <input
                      type="date"
                      aria-label="Data final"
                      value={customEnd}
                      min={customStart || undefined}
                      onChange={(event) => setCustomEnd(event.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          {customPeriodInvalid && (
            <p className="period-error" role="alert">
              Informe as duas datas e confira se a data inicial não é posterior à data final.
            </p>
          )}

          {active === 'dashboard' && (
            <>
              <div className="summary-grid">
                <article className="summary-card">
                  <div className="card-heading">
                    Receitas recebidas{' '}
                    <span className="card-icon green">↗</span>
                  </div>
                  <h2>{formatMoney(received)}</h2>
                  <small>Entradas confirmadas no período</small>
                </article>
                <article className="summary-card">
                  <div className="card-heading">
                    Despesas pagas <span className="card-icon red">↙</span>
                  </div>
                  <h2>{formatMoney(paidExpenses)}</h2>
                  <small>Saídas confirmadas no período</small>
                </article>
                <article className="summary-card">
                  <div className="card-heading">
                    Saldo do período <span className="card-icon dark">◈</span>
                  </div>
                  <h2>{formatMoney(balance)}</h2>
                  <small>Receitas recebidas menos despesas pagas</small>
                </article>
                <article className="summary-card">
                  <div className="card-heading">
                    Contas pendentes <span className="card-icon orange">◷</span>
                  </div>
                  <h2>{formatMoney(pendingExpenses)}</h2>
                  <small>Despesas previstas ainda não pagas</small>
                </article>
              </div>

              <div className="dashboard-grid">
                <section className="panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Resumo financeiro</h3>
                      <p>{periodLabel}</p>
                    </div>
                    <span className="tag">
                      {periodMode === 'monthly' ? 'Mensal' : periodMode === 'yearly' ? 'Anual' : 'Personalizado'}
                    </span>
                  </div>
                  <div className="comparison-chart">
                    <div className="comparison-row">
                      <div className="comparison-label">
                        <span>
                          <i className="comparison-dot income-dot" />
                          Receitas recebidas
                        </span>
                        <strong>{formatMoney(received)}</strong>
                      </div>
                      <div className="comparison-track">
                        <div
                          className="comparison-bar income-bar"
                          style={{ width: `${incomeWidth}%` }}
                        />
                      </div>
                    </div>

                    <div className="comparison-row">
                      <div className="comparison-label">
                        <span>
                          <i className="comparison-dot expense-dot" />
                          Despesas pagas
                        </span>
                        <strong>{formatMoney(paidExpenses)}</strong>
                      </div>
                      <div className="comparison-track">
                        <div
                          className="comparison-bar expense-bar"
                          style={{ width: `${expenseWidth}%` }}
                        />
                      </div>
                    </div>

                    <div
                      className={`comparison-balance ${
                        balance < 0n ? 'negative' : 'positive'
                      }`}
                    >
                      <span>Resultado do período</span>
                      <strong>{formatMoney(balance)}</strong>
                    </div>
                    <p className="comparison-note">
                      Comparação entre valores efetivamente recebidos e despesas
                      efetivamente pagas.
                    </p>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Visão de planejamento</h3>
                      <p>Seu dinheiro sob controle</p>
                    </div>
                  </div>
                  <div className="planning-item">
                    <span>Receitas previstas</span>
                    <strong>{formatMoney(plannedIncome)}</strong>
                  </div>
                  <div className="planning-item">
                    <span>Despesas pendentes</span>
                    <strong>{formatMoney(pendingExpenses)}</strong>
                  </div>
                  <div className="planning-total">
                    <span>Pode gastar</span>
                    <strong>{formatMoney(canSpend)}</strong>
                    <small>
                      Estimativa: saldo recebido menos despesas pendentes. Não
                      representa saldo bancário.
                    </small>
                  </div>
                </section>
              </div>

              <section className="panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Despesas por categoria</h3>
                    <p>Distribuição das despesas pagas em {periodLabel}</p>
                  </div>
                  <span className="tag">Categorias</span>
                </div>

                {expensesByCategory.length === 0 ? (
                  <div className="empty-chart">
                    <div className="chart-symbol">▥</div>
                    <strong>Nenhuma despesa paga neste período</strong>
                    <p>
                      Quando você registrar despesas pagas, o gráfico mostrará
                      onde seu dinheiro está sendo utilizado.
                    </p>
                  </div>
                ) : (
                  <div className="category-chart-layout">
                    <div
                      className="donut-chart"
                      style={{ background: expenseDonut }}
                    >
                      <div className="donut-hole">
                        <strong>{formatMoney(paidExpenses)}</strong>
                        <small>Total pago</small>
                      </div>
                    </div>

                    <div className="category-legend">
                      {expensesByCategory.map((item) => {
                        const share = Number(
                          (item.value * 100n) / paidExpenses
                        );

                        return (
                          <div className="category-legend-item" key={item.name}>
                            <div className="category-legend-name">
                              <span
                                className="category-dot"
                                style={{ background: item.visual.color }}
                              />
                              <span>{item.visual.icon}</span>
                              <span>{item.name}</span>
                            </div>

                            <div className="category-legend-value">
                              <strong>{formatMoney(item.value)}</strong>
                              <small>{share}%</small>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <section className="panel transactions-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Últimos lançamentos</h3>
                    <p>Movimentações do período selecionado</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setActive('transactions')}
                  >
                    Ver todos →
                  </button>
                </div>
                <TransactionList
                  items={visibleTransactions.slice(0, 5)}
                  onEdit={openEdit}
                  onDelete={deleteTransaction}
                />
              </section>
            </>
          )}

          {(active === 'transactions' ||
            active === 'income' ||
            active === 'expenses') && (
            <section className="panel transactions-panel">
              <div className="panel-heading">
                <div>
                  <h3>{current?.label}</h3>
                  <p>Cadastre e acompanhe suas movimentações.</p>
                </div>
                <button className="primary-button" onClick={() => openNew()}>
                  + Novo lançamento
                </button>
              </div>

              <div className="transaction-filters">
                <label>
                  Situação
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as typeof filter)}
                  >
                    <option value="todos">Todas</option>
                    <option value="pago">Pagos/recebidos</option>
                    <option value="previsto">Previstos</option>
                  </select>
                </label>
                <span>{visibleTransactions.length} lançamento(s)</span>
              </div>

              {formOpen && (
                <form className="transaction-form" onSubmit={saveTransaction}>
                  <div className="form-title">
                    <h3>
                      {editingId ? 'Editar lançamento' : 'Novo lançamento'}
                    </h3>
                    <button
                      type="button"
                      className="close-button"
                      onClick={() => setFormOpen(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="type-switch">
                    <button
                      type="button"
                      className={
                        form.type === 'receita' ? 'selected income' : ''
                      }
                      onClick={() => changeType('receita')}
                    >
                      ↗ Receita
                    </button>
                    <button
                      type="button"
                      className={
                        form.type === 'despesa' ? 'selected expense' : ''
                      }
                      onClick={() => changeType('despesa')}
                    >
                      ↙ Despesa
                    </button>
                  </div>

                  <div className="form-grid">
                    <label className="field full">
                      Descrição
                      <input
                        required
                        maxLength={100}
                        value={form.description}
                        placeholder="Ex.: Conta de luz, salário..."
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      Valor (R$)
                      <input
                        required
                        inputMode="decimal"
                        value={form.amount}
                        placeholder="0,00"
                        onChange={(e) =>
                          setForm({ ...form, amount: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      Categoria
                      <select
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                      >
                        {categories[form.type].map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Data da ocorrência
                      <input
                        type="date"
                        
                        required
                        value={form.occurrenceDate}
                        onChange={(e) =>
                          setForm({ ...form, occurrenceDate: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      Situação
                      <select
                        value={form.status}
                        onChange={(e) =>
                          setForm({ ...form, status: e.target.value as Status })
                        }
                      >
                        <option value="pago">
                          {form.type === 'receita' ? 'Recebido' : 'Pago'}
                        </option>
                        <option value="previsto">Previsto</option>
                      </select>
                    </label>
                    {form.status === 'previsto' ? (
                      <label className="field">
                        Data de vencimento/ previsão
                        <input
                          type="date"
                          
                          required
                          value={form.dueDate}
                          onChange={(e) =>
                            setForm({ ...form, dueDate: e.target.value })
                          }
                        />
                      </label>
                    ) : (
                      <label className="field">
                        Data do pagamento/ recebimento
                        <input
                          type="date"
                          
                          required
                          value={form.paymentDate}
                          onChange={(e) =>
                            setForm({ ...form, paymentDate: e.target.value })
                          }
                        />
                      </label>
                    )}
                  </div>

                  {error && <p className="form-error">{error}</p>}
                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setFormOpen(false)}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="primary-button">
                      Salvar lançamento
                    </button>
                  </div>
                </form>
              )}

              <TransactionList
                items={visibleTransactions}
                onEdit={openEdit}
                onDelete={deleteTransaction}
              />
            </section>
          )}

          {active === 'debts' && (
            <section className="debt-section">
              <div className="debt-intro">
                <div>
                  <h2>Organize suas dívidas e acompanhe cada parcela.</h2>
                  <p>
                    Cadastre o valor total, distribua em parcelas e marque os
                    pagamentos conforme forem acontecendo.
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    setDebtError('');
                    setDebtFormOpen((open) => !open);
                  }}
                >
                  {debtFormOpen ? 'Fechar formulário' : '+ Nova dívida'}
                </button>
              </div>

              <div className="debt-summary-grid">
                {(() => {
                  const activeDebts = debts.filter((debt) => debt.active);
                  const totalOriginal = activeDebts.reduce(
                    (sum, debt) => sum + BigInt(debt.totalCents),
                    0n
                  );
                  const totalPaid = activeDebts.reduce(
                    (sum, debt) =>
                      sum +
                      debt.installments
                        .filter((item) => item.paidDate)
                        .reduce(
                          (part, item) => part + BigInt(item.amountCents),
                          0n
                        ),
                    0n
                  );
                  const totalOpen = activeDebts.reduce(
                    (sum, debt) =>
                      sum +
                      debt.installments
                        .filter((item) => !item.paidDate)
                        .reduce(
                          (part, item) => part + BigInt(item.amountCents),
                          0n
                        ),
                    0n
                  );
                  const overdue = activeDebts.reduce(
                    (sum, debt) =>
                      sum +
                      debt.installments.filter(
                        (item) => !item.paidDate && item.dueDate < localDate()
                      ).length,
                    0
                  );
                  return (
                    <>
                      <article className="summary-card">
                        <div className="card-heading">
                          Valor das dívidas{' '}
                          <span className="card-icon dark">▤</span>
                        </div>
                        <h2>{formatMoney(totalOriginal)}</h2>
                        <small>Valor original cadastrado</small>
                      </article>
                      <article className="summary-card">
                        <div className="card-heading">
                          Total já pago{' '}
                          <span className="card-icon green">✓</span>
                        </div>
                        <h2>{formatMoney(totalPaid)}</h2>
                        <small>Parcelas marcadas como pagas</small>
                      </article>
                      <article className="summary-card">
                        <div className="card-heading">
                          Saldo devedor{' '}
                          <span className="card-icon orange">◷</span>
                        </div>
                        <h2>{formatMoney(totalOpen)}</h2>
                        <small>Valor ainda não quitado</small>
                      </article>
                      <article className="summary-card">
                        <div className="card-heading">
                          Parcelas atrasadas{' '}
                          <span className="card-icon red">!</span>
                        </div>
                        <h2>{overdue}</h2>
                        <small>Vencidas e ainda não pagas</small>
                      </article>
                    </>
                  );
                })()}
              </div>

              {debtFormOpen && (
                <form className="panel debt-form" onSubmit={saveDebt}>
                  <div className="form-title">
                    <h3>Cadastrar nova dívida</h3>
                    <button
                      type="button"
                      className="close-button"
                      onClick={() => setDebtFormOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      Credor / instituição
                      <input
                        required
                        maxLength={80}
                        value={debtForm.creditor}
                        placeholder="Ex.: Banco, loja, pessoa..."
                        onChange={(event) =>
                          setDebtForm({
                            ...debtForm,
                            creditor: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Descrição
                      <input
                        required
                        maxLength={100}
                        value={debtForm.description}
                        placeholder="Ex.: Empréstimo, geladeira..."
                        onChange={(event) =>
                          setDebtForm({
                            ...debtForm,
                            description: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Valor total (R$)
                      <input
                        required
                        inputMode="decimal"
                        value={debtForm.total}
                        placeholder="Ex.: 1.500,00"
                        onChange={(event) =>
                          setDebtForm({
                            ...debtForm,
                            total: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Quantidade de parcelas
                      <input
                        required
                        type="number"
                        min="1"
                        max="120"
                        step="1"
                        value={debtForm.installmentCount}
                        onChange={(event) =>
                          setDebtForm({
                            ...debtForm,
                            installmentCount: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Primeiro vencimento
                      <input
                        required
                        type="date"
                        
                        value={debtForm.firstDueDate}
                        onChange={(event) =>
                          setDebtForm({
                            ...debtForm,
                            firstDueDate: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Categoria
                      <select
                        value={debtForm.category}
                        onChange={(event) =>
                          setDebtForm({
                            ...debtForm,
                            category: event.target.value,
                          })
                        }
                      >
                        {categories.despesa.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {debtError && <p className="form-error">{debtError}</p>}
                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setDebtFormOpen(false)}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="primary-button">
                      Criar dívida e parcelas
                    </button>
                  </div>
                  <p className="debt-form-note">
                    As parcelas serão distribuídas em valores iguais, com
                    eventual diferença de centavos ajustada nas primeiras
                    parcelas. A primeira data informada será respeitada.
                  </p>
                </form>
              )}

              {debts.length === 0 ? (
                <section className="panel debt-empty">
                  <div className="placeholder-icon">▤</div>
                  <h3>Nenhuma dívida cadastrada</h3>
                  <p>
                    Quando cadastrar uma dívida, você poderá acompanhar o que já
                    pagou e o que ainda falta.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => setDebtFormOpen(true)}
                  >
                    Cadastrar primeira dívida
                  </button>
                </section>
              ) : (
                <div className="debt-list">
                  {debts.map((debt) => {
                    const paidInstallments = debt.installments.filter(
                      (item) => item.paidDate
                    );
                    const pendingInstallments = debt.installments.filter(
                      (item) => !item.paidDate
                    );
                    const paidTotal = paidInstallments.reduce(
                      (sum, item) => sum + BigInt(item.amountCents),
                      0n
                    );
                    const openTotal = pendingInstallments.reduce(
                      (sum, item) => sum + BigInt(item.amountCents),
                      0n
                    );
                    const progress =
                      debt.totalCents === '0'
                        ? 0
                        : Number((paidTotal * 100n) / BigInt(debt.totalCents));
                    return (
                      <section className="panel debt-card" key={debt.id}>
                        <div className="debt-card-heading">
                          <div>
                            <span className="debt-category">
                              {categoryVisual(debt.category).icon}{' '}
                              {debt.category}
                            </span>
                            <h3>{debt.creditor}</h3>
                            <p>{debt.description}</p>
                          </div>
                          <span
                            className={`debt-state ${
                              pendingInstallments.length === 0
                                ? 'settled'
                                : 'ongoing'
                            }`}
                          >
                            {pendingInstallments.length === 0
                              ? 'Quitada'
                              : 'Em andamento'}
                          </span>
                        </div>
                        <div className="debt-values">
                          <div>
                            <small>Valor original</small>
                            <strong>
                              {formatMoney(BigInt(debt.totalCents))}
                            </strong>
                          </div>
                          <div>
                            <small>Saldo devedor</small>
                            <strong>{formatMoney(openTotal)}</strong>
                          </div>
                          <div>
                            <small>Parcelas pagas</small>
                            <strong>
                              {paidInstallments.length} de{' '}
                              {debt.installments.length}
                            </strong>
                          </div>
                        </div>
                        <div className="debt-progress-track">
                          <div
                            className="debt-progress-bar"
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                        <div className="debt-progress-caption">
                          <span>{progress}% quitado</span>
                          <span>{formatMoney(paidTotal)} pagos</span>
                        </div>

                        <p className="debt-form-note">
                          As parcelas pagas aqui entram automaticamente nas
                          despesas do painel, pela data do pagamento. As
                          parcelas pendentes entram nas contas do mês do
                          vencimento. Não registre a mesma parcela novamente em
                          Lançamentos.
                        </p>
                        <div className="debt-installments-heading">
                          <h4>Parcelas</h4>
                          <span>{pendingInstallments.length} pendente(s)</span>
                        </div>
                        <div className="table-wrap">
                          <table className="transaction-table debt-installments-table">
                            <thead>
                              <tr>
                                <th>Parcela</th>
                                <th>Vencimento</th>
                                <th>Valor</th>
                                <th>Situação</th>
                                <th>Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {debt.installments.map((installment) => {
                                const isOverdue =
                                  !installment.paidDate &&
                                  installment.dueDate < localDate();
                                return (
                                  <tr key={installment.id}>
                                    <td>
                                      <strong>
                                        {String(installment.number).padStart(
                                          2,
                                          '0'
                                        )}
                                        /{debt.installments.length}
                                      </strong>
                                    </td>
                                    <td>
                                      {new Date(
                                        `${installment.dueDate}T12:00:00`
                                      ).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td>
                                      {formatMoney(
                                        BigInt(installment.amountCents)
                                      )}
                                    </td>
                                    <td>
                                      <span
                                        className={`transaction-status ${
                                          installment.paidDate
                                            ? 'pago'
                                            : 'previsto'
                                        }`}
                                      >
                                        {installment.paidDate
                                          ? `Paga em ${new Date(
                                              `${installment.paidDate}T12:00:00`
                                            ).toLocaleDateString('pt-BR')}`
                                          : isOverdue
                                          ? 'Atrasada'
                                          : 'Pendente'}
                                      </span>
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        className="debt-pay-button"
                                        onClick={() =>
                                          toggleInstallment(
                                            debt.id,
                                            installment.id
                                          )
                                        }
                                      >
                                        {installment.paidDate
                                          ? 'Reabrir'
                                          : 'Marcar paga'}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {(active === 'goals' || active === 'budgets') && (
            <section className="panel section-placeholder">
              <div className="placeholder-icon">{current?.icon}</div>
              <h3>{current?.label}</h3>
              <p>Esta área será implementada nas próximas etapas.</p>
              <button
                className="primary-button"
                onClick={() => setActive('dashboard')}
              >
                Voltar ao painel
              </button>
            </section>
          )}

          <footer>
            GRANALUME © 2026 · Mais clareza. Mais controle. Mais futuro.
          </footer>
        </section>
      </main>
    </div>
  );
}

function TransactionList({
  items,
  onEdit,
  onDelete,
}: {
  items: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="empty-transactions">
        <span>⇄</span>
        <strong>Nenhum lançamento encontrado</strong>
        <p>
          Cadastre uma receita ou despesa para começar a acompanhar seu
          dinheiro.
        </p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="transaction-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Data</th>
            <th>Situação</th>
            <th>Valor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((tx) => (
            <tr key={tx.id}>
              <td>
                <strong>{tx.description}</strong>
              </td>
              <td>{tx.category}</td>
              <td>
                {new Date(
                  `${
                    tx.status === 'pago'
                      ? tx.paymentDate
                      : tx.dueDate || tx.occurrenceDate
                  }T12:00:00`
                ).toLocaleDateString('pt-BR')}
              </td>
              <td>
                <span className={`transaction-status ${tx.status}`}>
                  {tx.status === 'pago'
                    ? tx.type === 'receita'
                      ? 'Recebido'
                      : 'Pago'
                    : 'Previsto'}
                </span>
              </td>
              <td
                className={
                  tx.type === 'receita' ? 'income-value' : 'expense-value'
                }
              >
                {tx.type === 'receita' ? '+' : '−'}
                {formatMoney(BigInt(tx.amountCents))}
              </td>
              <td>
                <div className="row-actions">
                  <button
                    type="button"
                    onClick={() => onEdit(tx)}
                    aria-label="Editar lançamento"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(tx.id)}
                    aria-label="Excluir lançamento"
                  >
                    ⌫
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
