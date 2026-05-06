export interface AnesthesiaRecordModel {
  id: number;
  patientName: string;
  procedure: string;
  anesthetist: string;
  date: Date;
  notes?: string;
}