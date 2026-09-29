import {
  ADMINISTRATION_ROUTE_LABELS,
  AdministrationRouteEnum,
  DrugCategoryEnum,
  FluidCategoryEnum,
  INFUSION_RATE_UNIT_LABELS,
  InfusionRateUnitEnum,
  MEDICATION_UNIT_LABELS,
  MedicationUnitEnum,
  SurgeryStatusEnum,
} from 'src/app/core/models/api-enums.model';
import {
  ConsumptionEvent,
  ConsumptionPhase,
  ConsumptionSourceData,
  ConsumptionSummary,
  ConsumptionTimes,
  DrugAdministration,
  DrugGroup,
  DrugGroupKind,
  FluidEntry,
  FluidGroup,
  FluidSummary,
  GasInterval,
  GasSummary,
  InfusionEndBasis,
  PumpSummary,
  UnitTotal,
} from 'src/app/core/models/consumption-summary.model';
import { isHydrationEntry } from 'src/app/features/monitorizacao/utils/fluid-balance.util';


const MINUTE_MS = 60_000;
/** Janela padrão que a Monitorização grava como fim de bombas fora de mL/h (não é um término real). */
const DEFAULT_PUMP_WINDOW_MS = 2 * 60 * 60 * 1000;
/** Tolerância de comparação: o servidor guarda a hora com precisão de segundos. */
const TIMESTAMP_TOLERANCE_MS = 2000;

export function buildConsumptionSummary(input: ConsumptionSourceData, now: Date = new Date()): ConsumptionSummary {
  const monitoring = input.monitoring ?? {};
  const nowMs = now.getTime();

  const phase = resolvePhase(input, monitoring);
  const isLive = phase === 'in-progress';
  const times = buildTimes(monitoring, input.ignoreAnesthesiaEnd, isLive, nowMs);
  const anesthesiaEndMs = toMs(times.anesthesiaEnd);
  const referenceDate = times.anesthesiaStart ?? times.surgeryStart;

  const pumps = buildPumps(asArray(monitoring.infusionPumps), input, isLive, nowMs, anesthesiaEndMs);
  const drugGroups = buildDrugGroups(asArray(monitoring.agents), input, referenceDate, pumps);

  const fluids = buildFluids(asArray(monitoring.fluidBalance));
  const o2 = buildGas('o2', asArray(monitoring.oxygenFlows), isLive, nowMs, anesthesiaEndMs);
  const air = buildGas('air', asArray(monitoring.compressedAirFlows), isLive, nowMs, anesthesiaEndMs);

  const agents = drugGroups.filter(g => g.kind === 'agent');
  const medications = drugGroups.filter(g => g.kind === 'medication');
  const solutions = drugGroups.filter(g => g.kind === 'solution');

  return {
    surgeryId: input.surgeryId,
    generatedAt: now.toISOString(),
    phase,
    isLive,
    source: input.monitoringSource,
    fichaSource: input.fichaSource,
    pendingSync: input.pendingSync,
    monitoringStatus: input.monitoringStatus,
    recordStatus: input.recordStatus,
    weightKg: input.weightKg,
    times,
    agents,
    medications,
    solutions,
    fluids,
    pumps,
    gases: { o2, air },
    oxygenSupplementation: input.oxygenSupplementation,
    events: buildEvents(asArray(monitoring.events ?? monitoring.clinicalEvents)),
    overview: {
      administrations: drugGroups.reduce((s, g) => s + g.administrations.length, 0),
      distinctDrugs: drugGroups.length,
      agentCount: agents.length,
      totalGainMl: fluids.totalGainMl,
      totalLossMl: fluids.totalLossMl,
      balanceMl: fluids.balanceMl,
      pumpCount: pumps.length,
      runningPumps: pumps.filter(p => p.isRunning).length,
      o2Min: o2.totalMin,
      airMin: air.totalMin,
    },
  };
}


function resolvePhase(input: ConsumptionSourceData, monitoring: any): ConsumptionPhase {
  if (input.recordStatus === SurgeryStatusEnum.Concluido) return 'finalized';
  if (input.monitoringStatus === SurgeryStatusEnum.Concluido) return 'monitoring-finished';
  if (input.monitoringSource === 'cache') return 'monitoring-finished';
  if (input.monitoringSource === 'local' && (monitoring.finalized || validIso(monitoring.anesthesiaEndTime)))
    return 'monitoring-finished';
  if (validIso(monitoring.anesthesiaStartTime) || validIso(monitoring.startedAt)) return 'in-progress';
  return 'not-started';
}

function buildTimes(monitoring: any, ignoreAnesthesiaEnd: boolean, isLive: boolean, nowMs: number): ConsumptionTimes {
  const anesthesiaStart = validIso(monitoring.anesthesiaStartTime ?? monitoring.startedAt);
  const surgeryStart = validIso(monitoring.surgeryStartTime ?? monitoring.surgeryStartedAt);
 
  const rawSurgeryEnd = validIso(monitoring.surgeryEndTime ?? monitoring.surgeryEndedAt);
  const rawAnesthesiaEnd = validIso(monitoring.anesthesiaEndTime ?? monitoring.endedAt);
  const surgeryEnd = surgeryStart ? rawSurgeryEnd : null;
  const anesthesiaEnd = anesthesiaStart && !ignoreAnesthesiaEnd ? rawAnesthesiaEnd : null;

  const anesthesiaRunning = isLive && !!anesthesiaStart && !anesthesiaEnd;
  const surgeryRunning = isLive && !!surgeryStart && !surgeryEnd;

  return {
    anesthesiaStart,
    anesthesiaEnd,
    surgeryStart,
    surgeryEnd,
    anesthesiaMin: durationMin(anesthesiaStart, anesthesiaEnd ?? (anesthesiaRunning ? nowMs : null)),
    surgeryMin: durationMin(surgeryStart, surgeryEnd ?? (surgeryRunning ? nowMs : null)),
    anesthesiaRunning,
    surgeryRunning,
  };
}


export function classifyDrug(category: DrugCategoryEnum | null | undefined): DrugGroupKind {
  if (category === DrugCategoryEnum.Anestesico) return 'agent';
  if (category === DrugCategoryEnum.Solucao || category === DrugCategoryEnum.Diluente) return 'solution';
  return 'medication';
}

function buildDrugGroups(agents: any[], input: ConsumptionSourceData, referenceDate: string | null, pumps: PumpSummary[]): DrugGroup[] {
  const groups = new Map<string, DrugGroup>();

  const groupFor = (drugId: number | null, name: string, category: DrugCategoryEnum | null): DrugGroup => {
    const key = drugId ? `drug:${drugId}` : `name:${normalizeName(name)}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key, drugId, name, category, kind: classifyDrug(category),
        administrations: [], totals: [], unparsedCount: 0, routes: [],
        firstTime: null, lastTime: null, infusionMinutes: null,
      };
      groups.set(key, group);
    }
    if (!group.name && name) group.name = name;
    return group;
  };

  for (const a of agents) {
    const drugId = positiveId(a.medicationId ?? a.drugId);
    const category = drugId ? input.drugCategories[drugId] ?? null : null;
    const name = String(a.name ?? a.medicationName ?? a.drugName ?? '').trim();
    const dose = finiteOrNull(a.doseValue);
    const unit = unitLabel(a.unit);
    const timestamp = validIso(a.timestamp);
    groupFor(drugId, name, category).administrations.push({
      timestamp,
      time: timeOf(timestamp, a.time),
      dose,
      doseText: dose != null ? `${formatNumber(dose)} ${unit}`.trim() : String(a.dose ?? ''),
      unit,
      route: routeLabel(a),
      isBolus: !!a.isBolus,
      origin: 'monitoring',
    });
  }

  for (const m of input.fichaMedications) {
    if (!m.name && !m.medicationId) continue;
    const drugId = positiveId(m.medicationId);
    // Antibiótico profilático é antibiótico por definição, mesmo sem categoria no cadastro.
    const category = (drugId ? input.drugCategories[drugId] : null)
      ?? (m.origin === 'pre-anesthetic' ? null : DrugCategoryEnum.Antibiotico);
    const parsed = parseDoseText(m.doseText);
    groupFor(drugId, m.name, category).administrations.push({
      timestamp: combineDateAndTime(referenceDate, m.time),
      time: m.time,
      dose: parsed?.value ?? null,
      doseText: m.doseText,
      unit: parsed?.unit ?? '',
      route: m.route || null,
      isBolus: false,
      origin: m.origin,
    });
  }

  const infusionByDrug = new Map<number, number>();
  for (const p of pumps) {
    if (p.drugId && p.durationMin != null)
      infusionByDrug.set(p.drugId, (infusionByDrug.get(p.drugId) ?? 0) + p.durationMin);
  }

  const result = Array.from(groups.values());
  for (const g of result) {
    g.administrations.sort(bySortKey);
    const totals = new Map<string, number>();
    for (const adm of g.administrations) {
      if (adm.dose == null) {
        g.unparsedCount++;
        continue;
      }
      totals.set(adm.unit, (totals.get(adm.unit) ?? 0) + adm.dose);
    }
    g.totals = Array.from(totals.entries()).map(([unit, total]) => ({ unit, total: round(total, 3) }));
    g.routes = unique(g.administrations.map(a => a.route).filter((r): r is string => !!r));
    const times = g.administrations.map(a => a.time).filter((t): t is string => !!t);
    g.firstTime = times[0] ?? null;
    g.lastTime = times[times.length - 1] ?? null;
    g.infusionMinutes = g.drugId ? infusionByDrug.get(g.drugId) ?? null : null;
    if (!g.name) g.name = g.drugId ? `#${g.drugId}` : '—';
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * "1g", "1,5 g", "500 mg" → { value, unit }. Qualquer outro texto livre ("1 ampola", "2 g + 1 g")
 * → null: a dose aparece no histórico, mas fica fora do total em vez de ser interpretada.
 */
export function parseDoseText(text: string | null | undefined): { value: number; unit: string } | null {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*(mg|g|mcg|µg|μg|ug|ml|l|ui|u|%|meq|mmol)?\s*$/i.exec(String(text ?? ''));
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  return { value, unit: normalizeUnit(match[2] ?? '') };
}

function normalizeUnit(unit: string): string {
  const lower = unit.trim().toLowerCase();
  switch (lower) {
    case 'ml': return 'mL';
    case 'l': return 'L';
    case 'mcg': case 'µg': case 'μg': case 'ug': return 'mcg';
    case 'ui': case 'u': return 'UI';
    case 'meq': return 'mEq';
    default: return lower;
  }
}

function routeLabel(a: any): string | null {
  const label = typeof a.route === 'string' && a.route ? a.route : typeof a.via === 'string' && a.via ? a.via : null;
  const fromId = typeof a.routeId === 'number' ? ADMINISTRATION_ROUTE_LABELS[a.routeId as AdministrationRouteEnum] : null;
  const resolved = label ?? fromId ?? null;
  return resolved ? resolved.split(' (')[0] : null;
}

function unitLabel(unit: any): string {
  if (typeof unit === 'number') return MEDICATION_UNIT_LABELS[unit as MedicationUnitEnum] ?? '';
  if (typeof unit === 'string') return unit;
  return '';
}

// ---------------------------------------------------------------------------
// Balanço hídrico
// ---------------------------------------------------------------------------

/**
 * Ganhos e perdas vêm só do balanço hídrico (a mesma base de `balanceTotals` da Monitorização).
 * Soluções lançadas como fármaco e volumes de bomba ficam em suas seções e NÃO entram aqui,
 * para não contar duas vezes o mesmo volume.
 */
function buildFluids(records: any[]): FluidSummary {
  const gains: FluidEntry[] = [];
  const losses: FluidEntry[] = [];

  for (const r of records) {
    const volumeMl = finiteOrNull(r.volumeMl ?? r.volume);
    if (volumeMl == null) continue;
    const type = (r.type ?? r.tipo) === 'loss' ? 'loss' : 'gain';
    const categoryId = typeof r.categoryId === 'number' ? r.categoryId as FluidCategoryEnum : null;
    const hydration = type === 'gain' && isHydrationEntry({ ...r, type, itemId: r.itemId ?? null, categoryId });
    const timestamp = validIso(r.timestamp);
    const entry: FluidEntry = {
      timestamp,
      time: timeOf(timestamp, r.time),
      name: String(r.item ?? r.detail ?? '').trim(),
      volumeMl,
      categoryId,
      isHydration: hydration,
      detail: r.detail && r.detail !== r.item ? String(r.detail) : null,
    };
    (type === 'gain' ? gains : losses).push(entry);
  }

  const groupBy = (entries: FluidEntry[], keyOf: (e: FluidEntry) => string, labelOf: (e: FluidEntry) => string): FluidGroup[] => {
    const map = new Map<string, FluidGroup>();
    for (const e of [...entries].sort(bySortKey)) {
      const key = keyOf(e);
      let group = map.get(key);
      if (!group) {
        group = { key, label: labelOf(e), categoryId: e.categoryId, isHydration: e.isHydration, totalMl: 0, entries: [] };
        map.set(key, group);
      }
      group.totalMl = round(group.totalMl + e.volumeMl, 1);
      group.entries.push(e);
    }
    return Array.from(map.values()).sort((a, b) => b.totalMl - a.totalMl);
  };

  const typeKey = (e: FluidEntry) => (e.isHydration ? 'hydration' : `category:${e.categoryId ?? FluidCategoryEnum.Other}`);
  const totalGainMl = round(gains.reduce((s, e) => s + e.volumeMl, 0), 1);
  const totalLossMl = round(losses.reduce((s, e) => s + e.volumeMl, 0), 1);

  return {
    gainsByItem: groupBy(gains, e => (e.isHydration ? 'hydration' : `item:${normalizeName(e.name)}`), e => e.name),
    gainsByType: groupBy(gains, typeKey, typeKey),
    lossesByType: groupBy(losses, typeKey, typeKey),
    totalGainMl,
    totalLossMl,
    balanceMl: round(totalGainMl - totalLossMl, 1),
    entryCount: gains.length + losses.length,
  };
}

// ---------------------------------------------------------------------------
// Bombas de infusão
// ---------------------------------------------------------------------------

/**
 * A Monitorização registra cada bomba com início, vazão, volume programado e `endAt`:
 * - mL/h: `endAt` = início + volume ÷ vazão (fim programado) ou a hora do "Parar infusão";
 * - demais unidades: `endAt` = início + 2 h (janela padrão, não é término real) ou a hora do "Parar".
 * Não há registro de pausa, retomada ou troca de vazão; cada novo lançamento é outra bomba.
 */
function buildPumps(records: any[], input: ConsumptionSourceData, isLive: boolean, nowMs: number, anesthesiaEndMs: number | null): PumpSummary[] {
  return records
    .map((p, index): PumpSummary => {
      const drugId = positiveId(p.medicationId ?? p.drugId);
      const startTimestamp = validIso(p.timestamp);
      const startMs = toMs(startTimestamp);
      const registeredEndAt = validIso(p.endAt);
      const registeredEndMs = toMs(registeredEndAt);
      const rate = finiteOrNull(p.rate);
      const rateUnitId = rateUnitOf(p.rateUnit);
      const programmedVolumeMl = positiveOrNull(p.volumeMl);
      const isMlPerHour = rateUnitId === InfusionRateUnitEnum.MillilitersPerHour;

      let endBasis: InfusionEndBasis = 'not-registered';
      let endMs: number | null = null;

      if (startMs != null && registeredEndMs != null && registeredEndMs > startMs) {
        const span = registeredEndMs - startMs;
        const isDefaultWindow = !isMlPerHour && Math.abs(span - DEFAULT_PUMP_WINDOW_MS) <= TIMESTAMP_TOLERANCE_MS;
        const scheduledSpan = isMlPerHour && rate && rate > 0 && programmedVolumeMl ? (programmedVolumeMl / rate) * 3_600_000 : null;
        const isVolumeSchedule = scheduledSpan != null && Math.abs(span - scheduledSpan) <= TIMESTAMP_TOLERANCE_MS;

        if (isLive && nowMs < registeredEndMs) {
          endBasis = 'running';
          endMs = nowMs;
        } else if (isDefaultWindow) {
          endBasis = 'not-registered';
        } else if (isVolumeSchedule) {
          if (anesthesiaEndMs != null && anesthesiaEndMs < registeredEndMs && anesthesiaEndMs > startMs) {
            endBasis = 'capped-anesthesia-end';
            endMs = anesthesiaEndMs;
          } else {
            endBasis = 'volume-completed';
            endMs = registeredEndMs;
          }
        } else {
          endBasis = 'stopped';
          endMs = registeredEndMs;
        }
      }

      const minutes = startMs != null && endMs != null ? Math.max(0, (endMs - startMs) / MINUTE_MS) : null;
      let infusedVolumeMl: number | null = null;
      let infusedAmount: UnitTotal | null = null;

      if (minutes != null && rate != null && rate > 0) {
        switch (rateUnitId) {
          case InfusionRateUnitEnum.MillilitersPerHour: {
            const volume = rate * (minutes / 60);
            infusedVolumeMl = round(programmedVolumeMl ? Math.min(volume, programmedVolumeMl) : volume, 1);
            break;
          }
          case InfusionRateUnitEnum.MicrogramsPerMinute:
            infusedAmount = { unit: 'mcg', total: round(rate * minutes, 1) };
            break;
          case InfusionRateUnitEnum.MicrogramsPerKgPerMinute:
            if (input.weightKg && input.weightKg > 0)
              infusedAmount = { unit: 'mcg', total: round(rate * input.weightKg * minutes, 1) };
            break;
          case InfusionRateUnitEnum.MilligramsPerHour:
            infusedAmount = { unit: 'mg', total: round(rate * (minutes / 60), 2) };
            break;
          case InfusionRateUnitEnum.InternationalUnitsPerHour:
            infusedAmount = { unit: 'UI', total: round(rate * (minutes / 60), 2) };
            break;
        }
      }

      const endTimestamp = endMs != null ? new Date(endMs).toISOString() : null;

      return {
        key: String(p.clientId ?? `pump-${index}`),
        drugId,
        name: String(p.medicationName ?? p.drugName ?? p.name ?? '').trim() || (drugId ? `#${drugId}` : '—'),
        category: drugId ? input.drugCategories[drugId] ?? null : null,
        startTimestamp,
        startTime: timeOf(startTimestamp, p.time),
        endTimestamp: endBasis === 'running' ? null : endTimestamp,
        registeredEndAt,
        endBasis,
        durationMin: minutes != null ? round(minutes, 1) : null,
        rate,
        rateUnitId,
        rateUnitLabel: rateUnitId ? INFUSION_RATE_UNIT_LABELS[rateUnitId] : String(p.rateUnit ?? ''),
        programmedVolumeMl,
        infusedVolumeMl,
        infusedAmount,
        isRunning: endBasis === 'running',
      };
    })
    .sort((a, b) => (toMs(a.startTimestamp) ?? 0) - (toMs(b.startTimestamp) ?? 0));
}

function rateUnitOf(value: any): InfusionRateUnitEnum | null {
  if (typeof value === 'number' && INFUSION_RATE_UNIT_LABELS[value as InfusionRateUnitEnum]) return value;
  if (typeof value === 'string') {
    const found = Object.entries(INFUSION_RATE_UNIT_LABELS).find(([, label]) => label.toLowerCase() === value.trim().toLowerCase());
    if (found) return Number(found[0]) as InfusionRateUnitEnum;
  }
  return null;
}

// ---------------------------------------------------------------------------
// O₂ / Ar comprimido
// ---------------------------------------------------------------------------

/**
 * Cada lançamento liga (`isActive=true`) ou desliga (`false`) o recurso. Intervalos:
 * ligado → próximo desligado. Religar com outro fluxo fecha o intervalo e abre outro.
 * Intervalo sem desligamento: em andamento conta até agora; com a anestesia encerrada,
 * limita-se ao término da anestesia (identificado); sem esse término, fica sem duração.
 */
function buildGas(kind: 'o2' | 'air', records: any[], isLive: boolean, nowMs: number, anesthesiaEndMs: number | null): GasSummary {
  const sorted = records
    .map(r => ({ ...r, _ms: toMs(validIso(r.timestamp)) }))
    .filter(r => r._ms != null)
    .sort((a, b) => a._ms - b._ms);

  const intervals: GasInterval[] = [];
  let open: { startMs: number; flow: number | null } | null = null;

  const close = (endMs: number | null, endBasis: GasInterval['endBasis']) => {
    if (!open) return;
    const minutes = endMs != null ? Math.max(0, (endMs - open.startMs) / MINUTE_MS) : null;
    intervals.push({
      start: new Date(open.startMs).toISOString(),
      end: endMs != null && endBasis !== 'running' ? new Date(endMs).toISOString() : null,
      startTime: formatLocalTime(open.startMs),
      endTime: endMs != null && endBasis !== 'running' ? formatLocalTime(endMs) : null,
      durationMin: minutes != null ? round(minutes, 1) : null,
      endBasis,
      flowLPerMin: open.flow,
      volumeL: minutes != null && open.flow != null ? round(open.flow * minutes, 1) : null,
    });
    open = null;
  };

  for (const r of sorted) {
    const flow = finiteOrNull(r.flowRateLPerMin);
    if (r.isActive) {
      if (!open) {
        open = { startMs: r._ms, flow };
      } else if (flow != null && flow !== open.flow) {
        close(r._ms, 'registered');
        open = { startMs: r._ms, flow };
      }
    } else if (open) {
      close(r._ms, 'registered');
    }
  }

  const stillOpen = !!open;
  if (open) {
    if (isLive) close(nowMs, 'running');
    else if (anesthesiaEndMs != null && anesthesiaEndMs > (open as { startMs: number }).startMs) close(anesthesiaEndMs, 'capped-anesthesia-end');
    else close(null, 'not-registered');
  }

  const durations = intervals.map(i => i.durationMin);
  const volumes = intervals.map(i => i.volumeL);

  return {
    kind,
    intervals,
    totalMin: intervals.length && durations.every(d => d != null) ? round(durations.reduce((s: number, d) => s + (d as number), 0), 1) : null,
    totalVolumeL: intervals.length && volumes.every(v => v != null) ? round(volumes.reduce((s: number, v) => s + (v as number), 0), 1) : null,
    isActive: stillOpen && isLive,
    firstStartTime: intervals[0]?.startTime ?? null,
    lastEndTime: intervals[intervals.length - 1]?.endTime ?? null,
    flowsRegistered: unique(intervals.map(i => i.flowLPerMin).filter((f): f is number => f != null)),
  };
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

function buildEvents(records: any[]): ConsumptionEvent[] {
  return records
    .map(e => {
      const timestamp = validIso(e.timestamp);
      return {
        timestamp,
        time: timeOf(timestamp, e.time),
        label: String(e.catalogEventName || e.categoryLabel || e.category || e.type || '').trim() || '—',
        description: (e.description ?? e.descricao ?? e.observacao ?? null) || null,
      };
    })
    .sort(bySortKey);
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function asArray(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function validIso(value: any): string | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) && d.getFullYear() > 1900 ? d.toISOString() : null;
}

function toMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function durationMin(startIso: string | null, end: string | number | null): number | null {
  const startMs = toMs(startIso);
  const endMs = typeof end === 'number' ? end : toMs(end);
  if (startMs == null || endMs == null || endMs < startMs) return null;
  return round((endMs - startMs) / MINUTE_MS, 1);
}

function formatLocalTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function timeOf(timestamp: string | null, fallback: any): string | null {
  const ms = toMs(timestamp);
  if (ms != null) return formatLocalTime(ms);
  return typeof fallback === 'string' && fallback ? fallback.slice(0, 5) : null;
}

function combineDateAndTime(referenceIso: string | null, time: string | null): string | null {
  if (!referenceIso || !time || !/^\d{2}:\d{2}/.test(time)) return null;
  const d = new Date(referenceIso);
  d.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  return d.toISOString();
}

function bySortKey(a: { timestamp: string | null; time: string | null }, b: { timestamp: string | null; time: string | null }): number {
  const am = toMs(a.timestamp);
  const bm = toMs(b.timestamp);
  if (am != null && bm != null) return am - bm;
  return String(a.time ?? '').localeCompare(String(b.time ?? ''));
}

function finiteOrNull(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positiveOrNull(value: any): number | null {
  const n = finiteOrNull(value);
  return n != null && n > 0 ? n : null;
}

function positiveId(value: any): number | null {
  const n = typeof value === 'string' && !/^\d+$/.test(value) ? NaN : Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizeName(name: string): string {
  return String(name ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function formatNumber(value: number): string {
  return String(round(value, 3)).replace('.', ',');
}
