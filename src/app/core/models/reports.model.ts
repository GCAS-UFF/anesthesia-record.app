import { ClinicalEventTypeEnum, SurgeryStatusEnum } from './api-enums.model';

export interface ReportFilters {
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  anesthesiologistId?: number | null;
  status?: SurgeryStatusEnum | null;
}

export interface NamedCountItem {
  id?: number | null;
  name: string;
  count: number;
}

export interface NamedVolumeItem {
  name: string;
  totalMl: number;
}

export interface DateCountItem {
  date: string;
  count: number;
}

export interface ScoreCountItem {
  score: number;
  count: number;
}

export interface AnesthetistOption {
  id: number;
  name: string;
}

export interface ReportsSummary {
  totalSurgeries: number;
  completedSurgeries: number;
  completedPercentage: number;
  canceledSurgeries: number;
  canceledPercentage: number;
  signedAnesthesiaRecords: number;
  clinicalEventsCount: number;
  administeredAgentsCount: number;
  lastMedicineSyncAt: string | null;
  lastProcedureSyncAt: string | null;
  lastProfessionalSyncAt: string | null;
}

export interface ClinicalEventTypeBreakdown {
  eventType: ClinicalEventTypeEnum;
  eventTypeLabel: string;
  count: number;
  percentage: number;
}

export interface ClinicalEventsReport {
  totalEvents: number;
  distinctEventTypes: number;
  surgeriesWithEvents: number;
  byType: ClinicalEventTypeBreakdown[];
  byAnesthetist: NamedCountItem[];
  byDay: DateCountItem[];
}

export interface DrugConsumptionItem {
  drugId: number;
  description: string;
  categoryLabel: string;
  count: number;
  percentage: number;
}

export interface DrugConsumptionReport {
  totalAdministrations: number;
  distinctDrugs: number;
  topDrug: string | null;
  topCategory: string | null;
  byDrug: DrugConsumptionItem[];
  byCategory: NamedCountItem[];
}

export interface ShiftBreakdownItem {
  shift: string;
  count: number;
  averageDurationMinutes: number | null;
}

export interface SurgeriesReport {
  totalSurgeries: number;
  surgeriesWithDurationData: number;
  averageDurationMinutes: number | null;
  minDurationMinutes: number | null;
  maxDurationMinutes: number | null;
  byDay: DateCountItem[];
  byShift: ShiftBreakdownItem[];
  byProcedure: NamedCountItem[];
}

export interface AnesthetistProductivityItem {
  anesthesiologistId: number;
  name: string;
  surgeriesCount: number;
  signedRecordsCount: number;
  averageDurationMinutes: number | null;
}

export interface AnesthetistsReport {
  anesthetists: AnesthetistProductivityItem[];
}

export interface CancellationsReport {
  totalSurgeries: number;
  canceledSurgeries: number;
  canceledPercentage: number;
  byAnesthetist: NamedCountItem[];
  byWeekday: NamedCountItem[];
}

export interface AsaDistributionItem {
  classification: number;
  label: string;
  count: number;
  percentage: number;
}

export interface AsaReport {
  totalEvaluated: number;
  distribution: AsaDistributionItem[];
  byAnesthetist: NamedCountItem[];
  byWeek: NamedCountItem[];
}

export interface RecoveryReport {
  patientsEvaluated: number;
  scoreDistribution: ScoreCountItem[];
  destinationDistribution: NamedCountItem[];
  dischargeConditionDistribution: NamedCountItem[];
  averageMinutesToAldreteEvaluation: number | null;
  evaluationsConsideredForTiming: number;
}

export interface AntibioticProphylaxisReport {
  totalSurgeries: number;
  surgeriesWithProphylaxis: number;
  surgeriesWithoutProphylaxis: number;
  adherencePercentage: number;
  topMedications: NamedCountItem[];
}

export interface FluidBalanceReport {
  totalGainMl: number;
  totalLossMl: number;
  balance: number;
  bleedingMl: number;
  bloodProductMl: number;
  byCategory: NamedVolumeItem[];
  byProcedure: NamedVolumeItem[];
}

export interface SyncStatus {
  lastSyncAt: string | null;
  isStale: boolean;
}

export interface IntegrationStatusReport {
  databaseHealthy: boolean;
  aghuHealthy: boolean;
  medicines: SyncStatus;
  procedures: SyncStatus;
  professionals: SyncStatus;
  checkedAt: string;
}
