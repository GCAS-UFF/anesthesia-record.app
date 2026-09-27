export interface TimelineWindow {
  viewStart: number;
  span: number;
}

/**
 * Janela de tempo da linha do tempo da Monitorização: do primeiro instante
 * conhecido (início da anestesia ou lançamento mais antigo) até o fim da
 * anestesia — ou até agora, enquanto ela está em andamento. Mínimo de 10 min.
 */
export function computeTimelineWindow(
  anesthesiaStart: Date | null,
  anesthesiaEnd: Date | null,
  firstRecordTimestamp: string | null | undefined,
): TimelineWindow {
  const candidates: number[] = [];
  if (anesthesiaStart) candidates.push(anesthesiaStart.getTime());
  if (firstRecordTimestamp) candidates.push(new Date(firstRecordTimestamp).getTime());
  const viewStart = candidates.length ? Math.min(...candidates) : Date.now() - 30 * 60 * 1000;
  const viewEnd = anesthesiaEnd ? anesthesiaEnd.getTime() : Date.now();
  const span = Math.max(viewEnd - viewStart, 10 * 60 * 1000);
  return { viewStart, span };
}
