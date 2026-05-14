export interface Agent {
    id?: string;
    name: string;
    dose: string;
    route: string; // EV, IM, Intratecal, etc.
    presentation: string; // Ampola, Frasco, Gel
    volume?: number; // mL
    time: string;
}

export interface ClinicalEvent {
    id?: string;
    name: string;
    time: string;
    type: 'event' | 'incident' | 'technique' | 'position';
}

export interface FluidBalance {
    id?: string;
    type: 'gain' | 'loss';
    category: string; // Glicosado, Cristalóide, Sangue, Diurese, etc.
    name: string;
    value: number;
    time: string;
    measured?: boolean; // Para diurese
}

export interface PatientPosition {
    id?: string;
    name: string;
    time: string;
}
