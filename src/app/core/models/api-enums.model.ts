export enum MedicationUnitEnum {
  Milligram = 1,          // mg
  Gram = 2,                // g
  Microgram = 3,             // mcg
  Milliliter = 4,              // mL
  Liter = 5,                     // L
  InternationalUnit = 6,           // UI
  Percentage = 7,                    // %
}

export const MEDICATION_UNIT_LABELS: Record<MedicationUnitEnum, string> = {
  [MedicationUnitEnum.Milligram]: 'mg',
  [MedicationUnitEnum.Gram]: 'g',
  [MedicationUnitEnum.Microgram]: 'mcg',
  [MedicationUnitEnum.Milliliter]: 'mL',
  [MedicationUnitEnum.Liter]: 'L',
  [MedicationUnitEnum.InternationalUnit]: 'UI',
  [MedicationUnitEnum.Percentage]: '%',
};

export enum AdministrationRouteEnum {
  IV = 1,
  IM = 2,
  VO = 3,
  SC = 4,
  IN = 5,
  Epidural = 6,
  Raquianestesia = 7,
}

export const ADMINISTRATION_ROUTE_LABELS: Record<AdministrationRouteEnum, string> = {
  [AdministrationRouteEnum.IV]: 'EV (Intravenosa)',
  [AdministrationRouteEnum.IM]: 'IM (Intramuscular)',
  [AdministrationRouteEnum.VO]: 'VO (Oral)',
  [AdministrationRouteEnum.SC]: 'SC (Subcutânea)',
  [AdministrationRouteEnum.IN]: 'IN (Inalatória)',
  [AdministrationRouteEnum.Epidural]: 'Peridural',
  [AdministrationRouteEnum.Raquianestesia]: 'Raquianestesia',
};


export enum MedicationPresentationEnum {
  Ampoule = 0,
  Vial = 1,
  Bottle = 2,
  Tablet = 3,
  Capsule = 4,
  Dragee = 5,
  Drops = 6,
  PreFilledSyringe = 7,
  Spray = 8,
  Ointment = 9,
  Cream = 10,
  Gel = 11,
  Powder = 12,
  OralSolution = 13,
  OralSuspension = 14,
  InhalationSolution = 15,
}

export enum ClinicalEventTypeEnum {
  Intubation = 1,
  Extubation = 2,
  Incision = 3,
  Block = 4,
  TourniquetOn = 5,
  TourniquetOff = 6,
  Position = 7,
  Complication = 8,
  Other = 9,
}

export const CLINICAL_EVENT_TYPE_LABELS: Record<ClinicalEventTypeEnum, string> = {
  [ClinicalEventTypeEnum.Intubation]: 'Intubação',
  [ClinicalEventTypeEnum.Extubation]: 'Extubação',
  [ClinicalEventTypeEnum.Incision]: 'Incisão',
  [ClinicalEventTypeEnum.Block]: 'Bloqueio',
  [ClinicalEventTypeEnum.TourniquetOn]: 'Garrote ON',
  [ClinicalEventTypeEnum.TourniquetOff]: 'Garrote OFF',
  [ClinicalEventTypeEnum.Position]: 'Posição',
  [ClinicalEventTypeEnum.Complication]: 'Complicação',
  [ClinicalEventTypeEnum.Other]: 'Outro',
};


export const CLINICAL_EVENT_TYPE_KEY_TO_ID: Record<string, ClinicalEventTypeEnum> = {
  intubation: ClinicalEventTypeEnum.Intubation,
  extubation: ClinicalEventTypeEnum.Extubation,
  incision: ClinicalEventTypeEnum.Incision,
  block: ClinicalEventTypeEnum.Block,
  tourniquet_on: ClinicalEventTypeEnum.TourniquetOn,
  tourniquet_off: ClinicalEventTypeEnum.TourniquetOff,
  position: ClinicalEventTypeEnum.Position,
  complication: ClinicalEventTypeEnum.Complication,
  other: ClinicalEventTypeEnum.Other,
};

export enum FluidCategoryEnum {
  Crystalloid = 1,
  Colloid = 2,
  BloodProduct = 3,
  Diuresis = 4,
  Bleeding = 5,
  Drain = 6,
  GastricLoss = 7,
  Other = 8,
}

export const FLUID_CATEGORY_LABELS: Record<FluidCategoryEnum, string> = {
  [FluidCategoryEnum.Crystalloid]: 'Cristaloide (SF/RL)',
  [FluidCategoryEnum.Colloid]: 'Coloide',
  [FluidCategoryEnum.BloodProduct]: 'Hemocomponente',
  [FluidCategoryEnum.Diuresis]: 'Diurese',
  [FluidCategoryEnum.Bleeding]: 'Sangramento',
  [FluidCategoryEnum.Drain]: 'Dreno',
  [FluidCategoryEnum.GastricLoss]: 'Aspirado gástrico',
  [FluidCategoryEnum.Other]: 'Outro',
};


export const FLUID_CATEGORY_KEY_TO_ID: Record<string, FluidCategoryEnum> = {
  crystalloid: FluidCategoryEnum.Crystalloid,
  colloid: FluidCategoryEnum.Colloid,
  albumin: FluidCategoryEnum.Colloid,
  blood: FluidCategoryEnum.BloodProduct,
  urine: FluidCategoryEnum.Diuresis,
  bleeding: FluidCategoryEnum.Bleeding,
  drain: FluidCategoryEnum.Drain,
  aspirate: FluidCategoryEnum.GastricLoss,
  insensible: FluidCategoryEnum.Other,
  other_gain: FluidCategoryEnum.Other,
  other_loss: FluidCategoryEnum.Other,
};

export enum FluidBalanceTypeEnum {
  Gain = 1,
  Loss = 2,
}

export enum SurgicalPositionEnum {
  Supine = 1,
  Prone = 2,
  Sitting = 3,
  LeftLateral = 4,
  RightLateral = 5,
  Trendelenburg = 6,
  Lithotomy = 7,
  ReverseTrendelenburg = 8,
  Jackknife = 9,
  Fowler = 10,
}

export const SURGICAL_POSITION_LABELS: Record<SurgicalPositionEnum, string> = {
  [SurgicalPositionEnum.Supine]: 'Supina',
  [SurgicalPositionEnum.Prone]: 'Prona',
  [SurgicalPositionEnum.Sitting]: 'Sentada',
  [SurgicalPositionEnum.LeftLateral]: 'Lateral Esquerda',
  [SurgicalPositionEnum.RightLateral]: 'Lateral Direita',
  [SurgicalPositionEnum.Trendelenburg]: 'Trendelenburg',
  [SurgicalPositionEnum.Lithotomy]: 'Litotomia',
  [SurgicalPositionEnum.ReverseTrendelenburg]: 'Trendelenburg Reverso',
  [SurgicalPositionEnum.Jackknife]: 'Canivete',
  [SurgicalPositionEnum.Fowler]: 'Fowler',
};


export const SURGICAL_POSITION_LABEL_TO_ID: Record<string, SurgicalPositionEnum> = {
  'supina': SurgicalPositionEnum.Supine,
  'prona': SurgicalPositionEnum.Prone,
  'sentada': SurgicalPositionEnum.Sitting,
  'sentado': SurgicalPositionEnum.Sitting,
  'lateral esquerda': SurgicalPositionEnum.LeftLateral,
  'lateral esquerdo': SurgicalPositionEnum.LeftLateral,
  'lateral direita': SurgicalPositionEnum.RightLateral,
  'lateral direito': SurgicalPositionEnum.RightLateral,
  'trendelenburg': SurgicalPositionEnum.Trendelenburg,
  'litotomia': SurgicalPositionEnum.Lithotomy,
  'litotomica': SurgicalPositionEnum.Lithotomy,
  'trendelenburg reverso': SurgicalPositionEnum.ReverseTrendelenburg,
  'canivete': SurgicalPositionEnum.Jackknife,
  'fowler': SurgicalPositionEnum.Fowler,
};

export enum DrugCategoryEnum {
  Outros = 0,
  Medicamento = 1,
  Antibiotico = 2,
  Anestesico = 3,
  Analgesico = 4,
  Sedativo = 5,
  BloqueadorNeuromuscular = 6,
  Vasopressor = 7,
  Antiemetico = 8,
  Diluente = 9,
  Solucao = 10,
  Material = 11,
  GasMedicinal = 12,
}

export const DRUG_CATEGORY_LABELS: Record<DrugCategoryEnum, string> = {
  [DrugCategoryEnum.Outros]: 'Outros',
  [DrugCategoryEnum.Medicamento]: 'Medicamento',
  [DrugCategoryEnum.Antibiotico]: 'Antibiótico',
  [DrugCategoryEnum.Anestesico]: 'Anestésico',
  [DrugCategoryEnum.Analgesico]: 'Analgésico',
  [DrugCategoryEnum.Sedativo]: 'Sedativo',
  [DrugCategoryEnum.BloqueadorNeuromuscular]: 'Bloqueador Neuromuscular',
  [DrugCategoryEnum.Vasopressor]: 'Vasopressor',
  [DrugCategoryEnum.Antiemetico]: 'Antiemético',
  [DrugCategoryEnum.Diluente]: 'Diluente',
  [DrugCategoryEnum.Solucao]: 'Solução',
  [DrugCategoryEnum.Material]: 'Material',
  [DrugCategoryEnum.GasMedicinal]: 'Gás Medicinal',
};

export enum SurgeryStatusEnum {
  Agendado = 1,
  EmPreparacao = 2,
  EmProgresso = 3,
  Concluido = 4,
  Cancelada = 5,
}

export const SURGERY_STATUS_LABELS: Record<SurgeryStatusEnum, string> = {
  [SurgeryStatusEnum.Agendado]: 'AGENDADA',
  [SurgeryStatusEnum.EmPreparacao]: 'EM PREPARO',
  [SurgeryStatusEnum.EmProgresso]: 'EM PROGRESSO',
  [SurgeryStatusEnum.Concluido]: 'CONCLUÍDA',
  [SurgeryStatusEnum.Cancelada]: 'CANCELADA',
};
