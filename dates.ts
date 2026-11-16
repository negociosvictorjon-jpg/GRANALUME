
export function localDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function competence(tx: {
  status: 'pago' | 'previsto';
  paymentDate: string;
  dueDate: string;
  occurrenceDate: string;
}): string {
  if (tx.status === 'pago') {
    return monthOf(tx.paymentDate || tx.occurrenceDate);
  }

  return monthOf(tx.dueDate || tx.occurrenceDate);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function installmentDate(firstDate: string, offset: number): string {
  const [year, month, day] = firstDate.split('-').map(Number);

  const targetMonth = month - 1 + offset;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = (targetMonth % 12) + 1;

  const lastDay = daysInMonth(targetYear, normalizedMonth);
  const targetDay = Math.min(day, lastDay);

  return [
    targetYear,
    String(normalizedMonth).padStart(2, '0'),
    String(targetDay).padStart(2, '0'),
  ].join('-');
}


export type DateRange = {
  start: string;
  end: string;
};

export function transactionDate(tx: {
  status: 'pago' | 'previsto';
  paymentDate: string;
  dueDate: string;
  occurrenceDate: string;
}): string {
  if (tx.status === 'pago') {
    return tx.paymentDate || tx.occurrenceDate;
  }

  return tx.dueDate || tx.occurrenceDate;
}

export function isDateInRange(date: string, range: DateRange): boolean {
  return Boolean(date) && date >= range.start && date <= range.end;
}
