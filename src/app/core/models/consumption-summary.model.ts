import { DrugCategoryEnum, FluidCategoryEnum, InfusionRateUnitEnum, SurgeryStatusEnum } from './api-enums.model';


export type ConsumptionSource = 'server' | 'local' | 'cache' | 'none';

export type ConsumptionPhase = 'not-started' | 'in-progress' | 'monitoring-finished' | 'finalized';

export type DrugGroupKind = 'agent' | 'medication' | 'solution';

export type AdministrationOrigin = 'monitoring' | 'pre-anesthetic' | 'antibiotic' | 'booster';


export interface FichaMedicationInput {
  origin: Exclude<AdministrationOrigin, 'monitoring'>;
  medicationId: number | null;
  name: string;
  doseText: string;
  route: string | null;
  time: string | null;
}


export interface ConsumptionSourceData {
  surgeryId: number;  
  monitoring: any | null;
  monitoringSource: ConsumptionSource;
  pendingSync: boolean;
  monitoringStatus: SurgeryStatusEnum | null;
  recordStatus: SurgeryStatusEnum | null;  
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
  totals: UnitTotal[];  
  unparsedCount: number;
  routes: string[];
  firstTime: string | null;
  lastTime: string | null;  
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
  label: string;
  categoryId: FluidCategoryEnum | null;
  isHydration: boolean;
  totalMl: number;
  entries: FluidEntry[];
}

export interface FluidSummary {  
  gainsByItem: FluidGroup[];  
  gainsByType: FluidGroup[];
  lossesByType: FluidGroup[];
  totalGainMl: number;
  totalLossMl: number;
  balanceMl: number;
  entryCount: number;
}


export type InfusionEndBasis = 'stopped' | 'volume-completed' | 'running' | 'capped-anesthesia-end' | 'not-registered';

export interface PumpSummary {
  key: string;
  drugId: number | null;
  name: string;
  category: DrugCategoryEnum | null;
  startTimestamp: string | null;
  startTime: string | null;  
  endTimestamp: string | null;  
  registeredEndAt: string | null;
  endBasis: InfusionEndBasis;
  durationMin: number | null;
  rate: number | null;
  rateUnitId: InfusionRateUnitEnum | null;
  rateUnitLabel: string;
  programmedVolumeMl: number | null;  
  infusedVolumeMl: number | null;  
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

export interface ConsumptionSummaryState {
  summary: ConsumptionSummary | null;
  loading: boolean;  
  error: 'forbidden' | 'unavailable' | null;  
  serverSyncedAt: string | null;
}
