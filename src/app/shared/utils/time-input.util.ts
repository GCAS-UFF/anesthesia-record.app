
export function maskTimeInput(raw: string): string {
  const cleaned = raw.replace(/[^\d:]/g, '');
  const digits = cleaned.replace(/:/g, '').slice(0, 4);

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}


export function normalizeTimeInput(raw: string | null | undefined): string {
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';

  let hh: string;
  let mm: string;
  if (digits.length <= 2) {
    hh = digits;
    mm = '00';
  } else {
    hh = digits.slice(0, digits.length - 2);
    mm = digits.slice(-2);
  }

  const hour = Math.min(23, parseInt(hh, 10) || 0);
  const minute = Math.min(59, parseInt(mm, 10) || 0);

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
