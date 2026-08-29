export interface InstitutionSettingsDto {
  monitoringIntervalMinutes: number;
  sigaApiUrl: string | null;
  aghuApiUrl: string | null;
  hospitalName: string;
  hospitalSector: string | null;
  hospitalCnpj: string | null;
  hospitalCep: string | null;
  hospitalStreet: string | null;
  hospitalNumber: string | null;
  hospitalNeighborhood: string | null;
  hospitalCity: string;
  hospitalState: string;
}

export interface UserSettingsDto {
  isAdmin: boolean;
  language: string;
  monitoringIntervalMinutes: number;
  useInstitutionalInterval: boolean;
  institutionalMonitoringIntervalMinutes: number;
  institution: InstitutionSettingsDto | null;
}

export interface UserSettingsCommand {
  language: string;
  monitoringIntervalMinutes: number;
  useInstitutionalInterval: boolean;
}

export interface InstitutionSettingsCommand {
  monitoringIntervalMinutes: number;
  sigaApiUrl: string | null;
  aghuApiUrl: string | null;
  hospitalName: string;
  hospitalSector: string | null;
  hospitalCnpj: string | null;
  hospitalCep: string | null;
  hospitalStreet: string | null;
  hospitalNumber: string | null;
  hospitalNeighborhood: string | null;
  hospitalCity: string;
  hospitalState: string;
}

export interface ChangeAdminPasswordCommand {
  currentPassword: string;
  newPassword: string;
}

export interface TestAghuConnectionCommand {
  aghuBaseUrl: string;
}

export interface TestConnectionResult {
  connected: boolean;
}
