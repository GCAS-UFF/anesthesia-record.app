/**
 * Modelo de dados da Avaliação Pré-Anestésica.
 *
 * Atualizado em 2026-08-21: o backend agora persiste este formulário
 * (PreAnesthesiaRecordController/PreAnesthesiaRecordCommand/Response — ver
 * UFF.Domain/Commands/PreAnesthesiaRecord e UFF.Domain/Response no repositório
 * da API). O contrato do backend foi desenhado a partir deste arquivo (ele é
 * a fonte de verdade), então os nomes de campo em inglês abaixo são os mesmos
 * usados no Command/Response — porém o backend usa um formato FLAT (sem
 * aninhamento por seção) enquanto este modelo mantém o agrupamento por seção
 * (procedure/anthropometry/habits/...) usado pelo formulário. A conversão
 * entre os dois formatos (achatar para enviar, reagrupar ao carregar) fica em
 * pre-anesthesic-record.service.ts, não neste arquivo nem no componente.
 */

export interface SelectOption<T = string> {
  value: T;
  label: string;
}

export interface ChecklistOption {
  /** chave estável em inglês — é o que é persistido no rascunho/payload */
  key: string;
  /** texto em português — é o que é exibido na interface */
  label: string;
}

export interface ChecklistGroupDef {
  key: string;
  title: string;
  options: ChecklistOption[];
}

function toOptions(pairs: Array<[string, string]>): ChecklistOption[] {
  return pairs.map(([key, label]) => ({ key, label }));
}

function toGroup(key: string, title: string, pairs: Array<[string, string]>): ChecklistGroupDef {
  return { key, title, options: toOptions(pairs) };
}

export const COMORBIDITY_GROUPS: ChecklistGroupDef[] = [
  toGroup('cardiovascular', 'Cardiovascular', [
    ['noChanges', 'Sem alterações'],
    ['hypertension', 'Hipertensão Arterial'],
    ['heartDisease', 'Cardiopatia'],
    ['arrhythmia', 'Arritmia'],
    ['heartFailure', 'Insuficiência Cardíaca'],
    ['other', 'Outros'],
  ]),
  toGroup('respiratory', 'Respiratório', [
    ['noChanges', 'Sem alterações'],
    ['asthma', 'Asma'],
    ['copd', 'DPOC'],
    ['bronchitis', 'Bronquite'],
    ['other', 'Outros'],
  ]),
  toGroup('neurological', 'Neurológico', [
    ['noChanges', 'Sem alterações'],
    ['epilepsy', 'Epilepsia'],
    ['parkinsons', 'Parkinson'],
    ['diabeticPeripheralNeuropathy', 'Neuropatia Periférica Diabética'],
    ['other', 'Outros'],
  ]),
  toGroup('genitourinary', 'Sistema gênito-urinário, incluindo DUM', [
    ['noChanges', 'Sem alterações'],
    ['renalFailure', 'Insuficiência renal'],
    ['chronicKidneyDisease', 'Doença renal crônica'],
    ['other', 'Outros'],
  ]),
  toGroup('endocrine', 'Endócrino', [
    ['noChanges', 'Sem alterações'],
    ['diabetes', 'Diabetes'],
    ['metabolicSyndrome', 'Síndrome metabólica'],
    ['hypothyroidism', 'Hipotireoidismo'],
    ['hyperthyroidism', 'Hipertireoidismo'],
    ['obesity', 'Obesidade'],
    ['other', 'Outros'],
  ]),
  toGroup('digestive', 'Digestivo', [
    ['noChanges', 'Sem alterações'],
    ['gastroesophagealReflux', 'Refluxo gastroesofágico'],
    ['gastricUlcer', 'Úlcera gástrica'],
    ['duodenalUlcer', 'Úlcera duodenal'],
    ['other', 'Outros'],
  ]),
  toGroup('immunologic', 'Imunológico', [
    ['noChanges', 'Sem alterações'],
    ['lupus', 'Lúpus'],
    ['rheumatoidArthritis', 'Artrite reumatóide'],
    ['hashimotoThyroiditis', 'Tireoidite de Hashimoto'],
    ['gravesDisease', 'Doença de Graves'],
    ['other', 'Outros'],
  ]),
];

export const PHYSICAL_EXAM_GROUPS: ChecklistGroupDef[] = [
  toGroup('cardiacAuscultation', 'Ausculta cardíaca', [
    ['noChanges', 'Sem alterações'],
    ['snaps', 'Estalidos'],
    ['clicks', 'Cliques'],
    ['thirdHeartSound', 'Terceira Bulha'],
    ['fourthHeartSound', 'Quarta Bulha'],
    ['hypophonesis', 'Hipofonese'],
    ['other', 'Outros'],
  ]),
  toGroup('pulmonaryAuscultation', 'Ausculta pulmonar', [
    ['noChanges', 'Sem alterações'],
    ['fineCrackles', 'Estertores crepitantes'],
    ['coarseCrackles', 'Estertores grossos'],
    ['wheezes', 'Sibilos'],
    ['rhonchi', 'Roncos'],
    ['other', 'Outros'],
  ]),
  toGroup('abdomen', 'Abdome', [['noChanges', 'Sem alterações']]),
  toGroup('upperLimbs', 'Membros Superiores', [['noChanges', 'Sem alterações']]),
  toGroup('lowerLimbs', 'Membros Inferiores', [['noChanges', 'Sem alterações']]),
  toGroup('lumbarBack', 'Dorso e Região Lombar', [['noChanges', 'Sem alterações']]),
];

export const DRUG_OPTIONS: ChecklistOption[] = toOptions([
  ['marijuana', 'Maconha'],
  ['cocaine', 'Cocaína'],
  ['heroin', 'Heroína'],
  ['lsd', 'LSD'],
  ['other', 'Outros'],
]);

export const ALLERGY_OPTIONS: ChecklistOption[] = toOptions([
  ['latex', 'Látex'],
  ['penicillin', 'Penicilina'],
  ['dipyrone', 'Dipirona'],
  ['ibuprofen', 'Ibuprofeno'],
  ['other', 'Outros'],
]);

export const CONDUCT_OPTIONS: ChecklistOption[] = toOptions([
  ['patientClearedForProcedure', 'Paciente liberado para o procedimento anestésico-cirúrgico'],
  ['patientInstructedOnFasting', 'Paciente orientado quanto ao jejum'],
  ['anesthesiaConsentSigned', 'Termo de Consentimento informado para Anestesia ou Sedação foi aplicado após os esclarecimentos'],
  ['transfusionConsentSigned', 'Termo de consentimento para Transfusão foi aplicado após os esclarecimentos'],
  ['preAnestheticMedicationPrescribed', 'Medicação pré-anestésica prescrita no prontuário'],
]);

export const ASA_OPTIONS: SelectOption<number>[] = [
  { value: 1, label: 'I' },
  { value: 2, label: 'II' },
  { value: 3, label: 'III' },
  { value: 4, label: 'IV' },
  { value: 5, label: 'V' },
  { value: 6, label: 'VI' },
];

export const MALLAMPATI_OPTIONS: SelectOption<number>[] = [
  { value: 1, label: 'I' },
  { value: 2, label: 'II' },
  { value: 3, label: 'III' },
  { value: 4, label: 'IV' },
];

export const LATERALITY_OPTIONS: SelectOption[] = [
  { value: 'RIGHT', label: 'Direita' },
  { value: 'LEFT', label: 'Esquerda' },
  { value: 'BILATERAL', label: 'Bilateral' },
  { value: 'NOT_APPLICABLE', label: 'Não se aplica' },
];

export const MUCOSA_OPTIONS: SelectOption[] = [
  { value: 'NORMAL_COLOR', label: 'Coradas' },
  { value: 'PALE', label: 'Hipocoradas' },
  { value: 'HYPEREMIC', label: 'Hipercoradas' },
  { value: 'HYDRATED', label: 'Hidratadas' },
  { value: 'DEHYDRATED', label: 'Desidratadas' },
  { value: 'OVERHYDRATED', label: 'Hiperhidratadas' },
];

export const DENTITION_OPTIONS: SelectOption[] = [
  { value: 'PRESENT', label: 'Presente' },
  { value: 'ABSENT', label: 'Ausente' },
  { value: 'UPPER_DENTURE', label: 'Prótese Superior' },
  { value: 'LOWER_DENTURE', label: 'Prótese Inferior' },
];

export const INTER_INCISOR_DISTANCE_OPTIONS: SelectOption[] = [
  { value: 'GREATER_THAN_3CM', label: '> 3 cm' },
  { value: 'LESS_THAN_3CM', label: '< 3 cm' },
  { value: 'NOT_APPLICABLE', label: 'NA' },
];

export const UPPER_INCISOR_LENGTH_OPTIONS: SelectOption[] = [
  { value: 'SHORT', label: 'Curto' },
  { value: 'LONG', label: 'Longo' },
  { value: 'NOT_APPLICABLE', label: 'NA' },
];

export const INCISOR_RELATION_OPTIONS: SelectOption[] = [
  { value: 'ALIGNED', label: 'Maxilares alinhados aos mandibulares' },
  { value: 'ANTERIOR', label: 'Maxilares anteriores' },
  { value: 'POSTERIOR', label: 'Maxilares posteriores' },
  { value: 'NOT_APPLICABLE', label: 'NA' },
];

export const PALATE_OPTIONS: SelectOption[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'NARROW', label: 'Estreito' },
  { value: 'HIGH_ARCHED', label: 'Ogival' },
];

export const YES_NO_NA_OPTIONS: SelectOption[] = [
  { value: 'YES', label: 'Sim' },
  { value: 'NO', label: 'Não' },
  { value: 'NOT_APPLICABLE', label: 'NA' },
];

export const NECK_LENGTH_OPTIONS: SelectOption[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LONG', label: 'Longo' },
  { value: 'SHORT', label: 'Curto' },
];

export const NECK_WIDTH_OPTIONS: SelectOption[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'THICK', label: 'Grosso' },
];

export const STERNOMENTAL_DISTANCE_OPTIONS: SelectOption[] = [
  { value: 'GREATER_THAN_12_5CM', label: '> 12,5 cm' },
  { value: 'LESS_THAN_12_5CM', label: '< 12,5 cm' },
];

export const THYROMENTAL_DISTANCE_OPTIONS: SelectOption[] = [
  { value: 'GREATER_OR_EQUAL_5CM', label: '≥ 5 cm' },
  { value: 'LESS_THAN_5CM', label: '< 5 cm' },
];

export const NORMAL_ABNORMAL_OPTIONS: SelectOption[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'ABNORMAL', label: 'Anormal' },
];

export const HUAP_SPECIALTY_OPTIONS: SelectOption[] = [
  { value: 'CARDIOLOGIST', label: 'Cardiologista' },
  { value: 'GENERAL_PRACTITIONER', label: 'Clínico Geral' },
  { value: 'PULMONOLOGIST', label: 'Pneumologista' },
  { value: 'NEPHROLOGIST', label: 'Nefrologista' },
  { value: 'ENDOCRINOLOGIST', label: 'Endocrinologista' },
  { value: 'OTHER', label: 'Outra' },
];

export interface PreAnesthesicSurgeryDraft {
  name: string;
  isPrimary: boolean;
}

export interface PreAnesthesicChecklistFinding {
  findings: string[];
  otherDescription: string;
  observations: string;
}

export interface PreAnesthesicMedicationDraft {
  name: string;
  dose: string;
  route: string;
  frequency: string;
}

export interface PreAnesthesicReportDraft {
  specialty: string;
  description: string;
}

export interface PreAnesthesicRecordDraft {
  procedure: {
    surgeries: PreAnesthesicSurgeryDraft[];
    laterality: string | null;
    preOperativeDiagnosis: string;
    consultationDate: string;
    observation: string;
  };
  anthropometry: {
    weightKg: number | null;
    heightCm: number | null;
    bmi: number | null;
    heartRate: number | null;
    systolicBloodPressure: number | null;
    diastolicBloodPressure: number | null;
    spo2: number | null;
    temperature: number | null;
    fastingSolidsHours: number | null;
    fastingLiquidsHours: number | null;
  };
  comorbidities: Record<string, PreAnesthesicChecklistFinding>;
  comorbiditiesOtherDescription: string;
  familyHistory: string;
  habits: {
    illicitDrugUse: boolean | null;
    drugTypes: string[];
    drugsOtherDescription: string;
    smoker: boolean | null;
    smokingLoad: string;
    alcoholUse: boolean | null;
    alcoholGramsPerDay: string;
  };
  allergies: {
    hasAllergy: boolean | null;
    substances: string[];
    otherDescription: string;
    reactionType: string;
    anestheticHistory: string;
  };
  medicationsInUse: {
    usesMedication: boolean | null;
    items: PreAnesthesicMedicationDraft[];
  };
  physicalExam: {
    areas: Record<string, PreAnesthesicChecklistFinding>;
    airway: {
      mucosa: string[];
      dentition: string | null;
      interIncisorDistance: string | null;
      upperIncisorLength: string | null;
      mallampatiClass: number | null;
      incisorRelation: string | null;
      palate: string | null;
      mandibleProtrusion: string | null;
      neckLength: string | null;
      neckWidth: string | null;
      sternomentalDistance: string | null;
      thyromentalDistance: string | null;
      neckFlexion: string | null;
      neckExtension: string | null;
      mandibularSpaceCompliance: string | null;
      observations: string;
    };
    thoracicCageAbnormality: boolean | null;
    thoracicCageAbnormalityDescription: string;
    difficultIntubationPrediction: boolean | null;
  };
  labs: {
    hemoglobin: number | null;
    hematocrit: number | null;
    leukocytes: number | null;
    platelets: number | null;
    tapInr: number | null;
    aptt: number | null;
    glucose: number | null;
    urea: number | null;
    creatinine: number | null;
    sodium: number | null;
    potassium: number | null;
    tp: string;
    urinalysis: string;
    liverFunctionTests: string;
    pregnancyTest: string;
  };
  imaging: {
    ecg: string;
    chestXRay: string;
    echocardiogram: string;
    pulmonaryFunctionTest: string;
    other: string;
  };
  reports: PreAnesthesicReportDraft[];
  conduct: {
    asaClassification: number | null;
    isEmergency: boolean;
    notCleared: boolean;
    notClearedReason: string;
    actions: string[];
    notes: string;
  };
}

export interface PreAnesthesicRecordPayload extends PreAnesthesicRecordDraft {  
  id?: number | null;
  anesthesiaRecordId: number | null;
  patientId: string | null;
  firstAnesthesiologistId?: number | string | null;
  signedByProfessionalId: number | null;
  signedByName: string;
  signedAt: string;
}
