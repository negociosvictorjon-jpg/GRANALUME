
const MAX_CENTS = 1_000_000_000_000_000n;

export function formatMoney(value: bigint) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const reais = absolute / 100n;
  const cents = String(absolute % 100n).padStart(2, '0');
  const formattedReais = new Intl.NumberFormat('pt-BR').format(reais);

  return `${negative ? '-' : ''}R$ ${formattedReais},${cents}`;
}

export function parseMoney(value: string): bigint | null {
  const cleaned = value
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '');

  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(cleaned)) {
    return null;
  }

  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const [reais, cents = ''] = normalized.split('.');
  const result = BigInt(reais) * 100n + BigInt(cents.padEnd(2, '0'));

  if (result <= 0n || result > MAX_CENTS) return null;

  return result;
}
