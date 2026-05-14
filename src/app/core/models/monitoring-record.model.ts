export interface MonitoringRecord {
    id?: string;
    surgeryId?: number;
    time: string;
    pas: number | null;
    pad: number | null;
    fc: number | null;
    spo2: number | null;
    temp: number | null;
    etco2: number | null;
    createdAt?: Date;
}
