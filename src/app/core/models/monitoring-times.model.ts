import { SurgeryStatusEnum } from './api-enums.model';

/**
 * Horários registrados na tela de Monitorização, já convertidos para "HH:mm" no fuso local.
 * Campo nulo = ainda não registrado (nunca é preenchido com valor fictício).
 */
export interface MonitoringTimes {
  status: SurgeryStatusEnum | null;
  anesthesiaStart: string | null;
  surgeryStart: string | null;
  surgeryEnd: string | null;
  anesthesiaEnd: string | null;
}
