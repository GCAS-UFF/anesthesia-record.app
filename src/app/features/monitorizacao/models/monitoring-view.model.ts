import {
  MedicationUnitEnum,
  AdministrationRouteEnum,
  ClinicalEventTypeEnum,
  FluidCategoryEnum,
  FluidBalanceTypeEnum,
  SurgicalPositionEnum,
  InfusionRateUnitEnum,
} from 'src/app/core/models/api-enums.model';


export interface VitalRecord {
  clientId?: string; timestamp: string; time: string;
  pas?: number; pad?: number; pam?: number;
  fc?: number; spo2?: number; etco2?: number;
  bis?: number; pvc?: number; pcap?: number; temp?: number;
  custom?: { [key: string]: number };
  isAuto?: boolean;
}

export interface Agent {
  clientId?: string; timestamp: string; time: string;
  name: string;
  dose?: string | null;
  route?: string | null;
  medicationId?: number | null;
  doseValue?: number | null;
  unit?: MedicationUnitEnum | null;
  routeId?: AdministrationRouteEnum | null;
  isBolus?: boolean;
}


export interface InfusionPumpEntry {
  clientId?: string; timestamp: string; time: string;
  medicationId: number;
  medicationName: string;
  rate: number;
  rateUnit: InfusionRateUnitEnum;
  volumeMl: number;
  endAt: string;
}

export interface ResourceFlowEntry {
  clientId?: string; timestamp: string; time: string;
  kind: 'o2' | 'air';
  flowRateLPerMin?: number | null;
  isActive: boolean;
}

export interface ClinicalEvent {
  clientId?: string; timestamp: string; time: string;
  type: string;
  description?: string;
  category?: string | null;
  categoryLabel?: string | null;
  itemId?: number | null;
  detail?: string | null;
  eventTypeId?: ClinicalEventTypeEnum | null;
  catalogEventId?: number | null;
  catalogEventName?: string | null;
}

export interface FluidBalance {
  clientId?: string; timestamp: string; time: string;
  type: 'gain' | 'loss'; item: string; volumeMl: number;
  itemId?: number | null;
  detail?: string | null;
  categoryId?: FluidCategoryEnum | null;
  balanceTypeId?: FluidBalanceTypeEnum | null;
}

export interface PositionEntry {
  clientId?: string; timestamp: string; time: string; position: string;
  positionId?: SurgicalPositionEnum | null;
}

export type MonitoringPhase = 'waiting' | 'in-progress' | 'finished';


export type PrimaryActionKind =
  | 'start-anesthesia'
  | 'start-surgery'
  | 'surgery-in-progress'
  | 'awaiting-finalize'
  | 'finished';

export type HistoryTab = 'vitals' | 'agents' | 'events' | 'balance';
