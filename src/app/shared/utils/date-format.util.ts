export function formatDateBR(value: string | null | undefined): string | null {
  if (!value) return null;
  const datePart = value.length >= 10 ? value.substring(0, 10) : value;
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
  }
  return value;
}

/** Formata data e hora (ex.: timestamps de assinatura) para dd/MM/yyyy HH:mm, no fuso local. */
export function formatDateTimeBR(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return formatDateBR(value);
  const datePart = `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
  const timePart = `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
  return `${datePart} ${timePart}`;
}
