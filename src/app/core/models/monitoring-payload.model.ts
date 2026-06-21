import { 
  UnitEnum, 
  AdministrationRouteEnum, 
  MedicationPresentationEnum, 
  ClinicalEventTypeEnum, 
  FluidBalanceTypeEnum, 
  FluidCategoryEnum 
} from './api-enums.model';

export interface MonitoringCustomFieldPayload {
  name: string;
  value: string;
}

export interface MonitoringVitalSignPayload {
  timestamp: string; // ISO 8601
  systolicBloodPressure: number | null;
  diastolicBloodPressure: number | null;
  meanArterialPressure: number | null;
  heartRate: number | null;
  spo2: number | null;
  etco2: number | null;
  temperature: number | null;
  bis: number | null;
  pvc: number | null;
  pcap: number | null;
  customFields: MonitoringCustomFieldPayload[];
}

export interface MonitoringAgentPayload {
  timestamp: string;
  name: string;
  dose: string;
  unit: UnitEnum;
  route: AdministrationRouteEnum;
  presentation: MedicationPresentationEnum;
}

export interface MonitoringEventPayload {
  timestamp: string;
  eventType: ClinicalEventTypeEnum;
  name: string;
  observations: string | null;
}

export interface MonitoringFluidBalancePayload {
  timestamp: string;
  balanceType: FluidBalanceTypeEnum;
  category: FluidCategoryEnum;
  name: string;
  volumeMl: number;
}

export interface MonitoringPayload {
  anesthesiaRecordId: number | null;
  surgeryId: number | null;
  recordedByProfessionalId: number | null;
  startedAt: string | null; // ISO 8601
  endedAt: string | null; // ISO 8601
  vitalSigns: MonitoringVitalSignPayload[];
  administeredAgents: MonitoringAgentPayload[];
  clinicalEvents: MonitoringEventPayload[];
  fluidBalances: MonitoringFluidBalancePayload[];
}
