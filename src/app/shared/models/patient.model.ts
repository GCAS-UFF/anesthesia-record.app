export interface Unit {
  code: string;
  description: string;
}

export interface CurrentLocation {
  unit: Unit;
  bed: string;
  floor: string;
  room: string;
}

export interface Specialty {
  code: string;
  description: string;
}

export interface SurgicalCenter {
  code: string;
  description: string;
}

export interface SurgeryLocation {
  surgicalCenter: SurgicalCenter;
  room: string;
}

export interface Procedure {
  id: string;
  description: string;
  cid: string;
  isPrimary: boolean;
}

export interface Surgery {
  id: string | number;
  surgeryDate: string;
  status: number;
  specialty: Specialty;
  location: SurgeryLocation;
  procedures: Procedure[];
}

export interface Patient {
  patientId: string;
  id: number;
  medicalRecordNumber: string;
  fullName: string;
  birthDate: string;
  gender: string;
  weightKg: number;
  heightCm: number;
  age: number;
  currentLocation: CurrentLocation;
  surgeries: Surgery[];
}

export interface PatientResponse {
  data: Patient[];
  totalItems: number;
  page: number;
  pageSize: number;
}
