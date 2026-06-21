export enum UnitEnum {
  Mg = 0,
  Mcg = 1,
  G = 2,
  Ml = 3,
  UI = 4
}

export enum AdministrationRouteEnum {
  IV = 1,
  IM = 2,
  VO = 3,
  SC = 4,
  IN = 5,
  Epidural = 6,
  Raquianestesia = 7
}

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
  InhalationSolution = 15
}

export enum ClinicalEventTypeEnum {
  Procedure = 0,
  Complication = 1,
  Medication = 2,
  Intercurrence = 3,
  Alert = 4,
  HemodynamicChange = 5,
  AirwayEvent = 6,
  Intubation = 7
}

export enum FluidCategoryEnum {
  Crystalloid = 0,
  Colloid = 1,
  BloodProduct = 2,
  Diuresis = 3,
  Bleeding = 4,
  Drain = 5,
  GastricLoss = 6
}

export enum FluidBalanceTypeEnum {
  Gain = 0,
  Loss = 1
}

export enum SurgeryStatusEnum {
  Agendado = 0,
  EmPreparacao = 1,
  EmProgresso = 2,
  Concluido = 3,
  Cancelada = 4
}
