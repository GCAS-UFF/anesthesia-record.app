import { FluidBalance } from '../models/monitoring-view.model';

/**
 * Rótulos com que a hidratação rápida é gravada (um por idioma do app).
 * A hidratação não passa pelo catálogo de balanço: no envio o backend recebe a
 * categoria padrão (Cristaloide) e o rótulo como descrição, então, depois de
 * recarregar da API, o rótulo é o único traço que a distingue de um ganho de catálogo.
 */
const HYDRATION_LABELS = new Set(['hidratação', 'hidratacao', 'hydration', 'hidratación', 'hidratacion']);

export function isHydrationEntry(b: FluidBalance): boolean {
  if (b.type !== 'gain') return false;
  if (b.itemId == null && b.categoryId == null) return true;
  return HYDRATION_LABELS.has((b.item || '').trim().toLowerCase());
}
