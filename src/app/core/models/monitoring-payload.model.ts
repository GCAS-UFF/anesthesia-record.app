import {
  MedicationUnitEnum,
  AdministrationRouteEnum,
  ClinicalEventTypeEnum,
  FluidBalanceTypeEnum,
  FluidCategoryEnum,
  SurgicalPositionEnum,
  SurgeryStatusEnum,
} from './api-enums.model';


export interface MonitoringCustomFieldPayload {
  name: string;
  value: string;
}

export interface MonitoringVitalSignPayload {
  time: string;
  date: string;
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
  time: string;
  date: string;
  dose: number;
  unit: MedicationUnitEnum;
  route: AdministrationRouteEnum;
  drugId: number;
}

export interface MonitoringEventPayload {
  time: string;
  date: string;
  eventType: ClinicalEventTypeEnum;
  observations: string | null;
}

export interface MonitoringFluidBalancePayload {
  time: string;
  date: string; 
  category: FluidCategoryEnum;
  description: string;
  volumeMl: number;
  type: FluidBalanceTypeEnum;
}

export interface MonitoringPositionPayload {
  time: string;
  date: string; 
  position: SurgicalPositionEnum;
}

export interface MonitoringPayload {
  anesthesiaRecordId: number;
  surgeryId: number;
  recordedByProfessionalId: number;
  startedAt: string | null; 
  endedAt: string | null;
  surgeryStartedAt: string | null; 
  surgeryEndedAt: string | null; 
  isMonitoringDraft: boolean;
  monitoringUpdatedAt: string; 
  vitalSigns: MonitoringVitalSignPayload[];
  administeredAgents: MonitoringAgentPayload[];
  clinicalEvents: MonitoringEventPayload[];
  fluidBalances: MonitoringFluidBalancePayload[];
  positions: MonitoringPositionPayload[];
  status: SurgeryStatusEnum;
}
