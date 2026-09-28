import { DrugCategoryEnum, FluidCategoryEnum, InfusionRateUnitEnum, SurgeryStatusEnum } from './api-enums.model';

/**
 * Resumo de insumos/consumo de uma cirurgia, consolidado a partir do que já foi registrado na
 * Monitorização e na Ficha Anestésica. Todo valor ausente é `null` ("Não registrado") — nunca zero
 * nem estimativa sem identificação.
 */

/** De onde vieram os dados da monitorização usados no resumo. */
export type ConsumptionSource = 'server' | 'local' | 'cache' | 'none';

export type ConsumptionPhase = 'not-started' | 'in-progress' | 'monitoring-finished' | 'finalized';

export type DrugGroupKind = 'agent' | 'medication' | 'solution';

export type AdministrationOrigin = 'monitoring' | 'pre-anesthetic' | 'antibiotic' | 'booster';

/** Medicação registrada na Ficha Anestésica (pré-anestésica, antibiótico, repique), já normalizada. */
export interface FichaMedicationInput {
  origin: Exclude<AdministrationOrigin, 'monitoring'>;
  medicationId: number | null;
  name: string;
  doseText: string;
  route: string | null;
  /** "HH:mm" (a ficha só registra a hora). */
  time: string | null;
}

/** Entrada do consolidador (montada pelo ConsumptionSummaryService). */
export interface ConsumptionSourceData {
  surgeryId: number;
  /** Monitorização no formato do app (rascunho local ou `mapMonitoringPayloadToApp`). */
  monitoring: any | null;
  monitoringSource: ConsumptionSource;
  /** Rascunho local com alterações ainda não enviadas ao servidor. */
  pendingSync: boolean;
  monitoringStatus: SurgeryStatusEnum | null;
  recordStatus: SurgeryStatusEnum | null;
  /** Registro do servidor em andamento: um fim de anestesia ali é resíduo de PUT de progresso antigo. */
  ignoreAnesthesiaEnd: boolean;
  fichaSource: 'server' | 'local' | 'none';
  fichaMedications: FichaMedicationInput[];
  oxygenSupplementation: { types: string[]; other: string | null } | null;
  drugCategories: Record<number, DrugCategoryEnum>;
  weightKg: number | null;
}

export interface DrugAdministration {
  timestamp: string | null;
  time: string | null;
  dose: number | null;
  doseText: string;
  unit: string;
  route: string | null;
  isBolus: boolean;
  origin: AdministrationOrigin;
}

export interface UnitTotal {
  unit: string;
  total: number;
}

export interface DrugGroup {
  key: string;
  drugId: number | null;
  name: string;
  category: DrugCategoryEnum | null;
  kind: DrugGroupKind;
  administrations: DrugAdministration[];
  /** Soma das doses por unidade (sem conversão entre unidades). */
  totals: UnitTotal[];
  /** Administrações cuja dose não é numérica (texto livre da ficha) — fora dos totais. */
  unparsedCount: number;
  routes: string[];
  firstTime: string | null;
  lastTime: string | null;
  /** Tempo de infusão por bomba do mesmo fármaco, quando houver (ver seção de bombas). */
  infusionMinutes: number | null;
}

export interface FluidEntry {
  timestamp: string | null;
  time: string | null;
  name: string;
  volumeMl: number;
  categoryId: FluidCategoryEnum | null;
  isHydration: boolean;
  detail: string | null;
}

export interface FluidGroup {
  key: string;
  /** Nome do item (soluções) ou chave de tradução do tipo (`hydration` / id da categoria). */
  label: string;
  categoryId: FluidCategoryEnum | null;
  isHydration: boolean;
  totalMl: number;
  entries: FluidEntry[];
}

export interface FluidSummary {
  /** Ganhos agrupados pelo item registrado (soluções/líquidos). */
  gainsByItem: FluidGroup[];
  /** Ganhos agrupados pelo tipo (categoria do balanço / hidratação). */
  gainsByType: FluidGroup[];
  lossesByType: FluidGroup[];
  totalGainMl: number;
  totalLossMl: number;
  balanceMl: number;
  entryCount: number;
}

/**
 * Como o fim da infusão foi determinado:
 * - `stopped`: parada registrada ("Parar infusão");
 * - `volume-completed`: fim programado pelo volume/vazão (mL/h) já alcançado;
 * - `running`: em andamento — tempo contado até agora;
 * - `capped-anesthesia-end`: sem parada registrada; limitado ao término da anestesia;
 * - `not-registered`: sem término registrado (janela padrão do sistema) — tempo não calculado.
 */
export type InfusionEndBasis = 'stopped' | 'volume-completed' | 'running' | 'capped-anesthesia-end' | 'not-registered';

export interface PumpSummary {
  key: string;
  drugId: number | null;
  name: string;
  category: DrugCategoryEnum | null;
  startTimestamp: string | null;
  startTime: string | null;
  /** Fim considerado no cálculo (null quando não registrado). */
  endTimestamp: string | null;
  /** `endAt` como está gravado no registro. */
  registeredEndAt: string | null;
  endBasis: InfusionEndBasis;
  durationMin: number | null;
  rate: number | null;
  rateUnitId: InfusionRateUnitEnum | null;
  rateUnitLabel: string;
  programmedVolumeMl: number | null;
  /** Volume infundido calculado (só para vazão em mL/h). */
  infusedVolumeMl: number | null;
  /** Quantidade de fármaco calculada pela vazão (mcg/min, mg/h, UI/h, mcg/kg/min com peso). */
  infusedAmount: UnitTotal | null;
  isRunning: boolean;
}

export type GasEndBasis = 'registered' | 'running' | 'capped-anesthesia-end' | 'not-registered';

export interface GasInterval {
  start: string;
  end: string | null;
  startTime: string;
  endTime: string | null;
  durationMin: number | null;
  endBasis: GasEndBasis;
  flowLPerMin: number | null;
  volumeL: number | null;
}

export interface GasSummary {
  kind: 'o2' | 'air';
  intervals: GasInterval[];
  totalMin: number | null;
  totalVolumeL: number | null;
  isActive: boolean;
  firstStartTime: string | null;
  lastEndTime: string | null;
  flowsRegistered: number[];
}

export interface ConsumptionTimes {
  anesthesiaStart: string | null;
  anesthesiaEnd: string | null;
  surgeryStart: string | null;
  surgeryEnd: string | null;
  anesthesiaMin: number | null;
  surgeryMin: number | null;
  anesthesiaRunning: boolean;
  surgeryRunning: boolean;
}

export interface ConsumptionEvent {
  timestamp: string | null;
  time: string | null;
  label: string;
  description: string | null;
}

export interface ConsumptionOverview {
  administrations: number;
  distinctDrugs: number;
  agentCount: number;
  totalGainMl: number;
  totalLossMl: number;
  balanceMl: number;
  pumpCount: number;
  runningPumps: number;
  o2Min: number | null;
  airMin: number | null;
}

export interface ConsumptionSummary {
  surgeryId: number;
  generatedAt: string;
  phase: ConsumptionPhase;
  isLive: boolean;
  source: ConsumptionSource;
  fichaSource: 'server' | 'local' | 'none';
  pendingSync: boolean;
  monitoringStatus: SurgeryStatusEnum | null;
  recordStatus: SurgeryStatusEnum | null;
  weightKg: number | null;
  times: ConsumptionTimes;
  agents: DrugGroup[];
  medications: DrugGroup[];
  solutions: DrugGroup[];
  fluids: FluidSummary;
  pumps: PumpSummary[];
  gases: { o2: GasSummary; air: GasSummary };
  oxygenSupplementation: { types: string[]; other: string | null } | null;
  events: ConsumptionEvent[];
  overview: ConsumptionOverview;
}

/** Estado exposto pela tela: resumo + situação da carga. */
export interface ConsumptionSummaryState {
  summary: ConsumptionSummary | null;
  loading: boolean;
  /** `forbidden`: sem permissão; `unavailable`: servidor inacessível e sem dados locais. */
  error: 'forbidden' | 'unavailable' | null;
  /** Última leitura bem-sucedida do servidor. */
  serverSyncedAt: string | null;
}
