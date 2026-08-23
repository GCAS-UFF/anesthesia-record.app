import {
  ChecklistOption,
  PreAnesthesicChecklistFinding,
  PreAnesthesicRecordDraft,
  PreAnesthesicRecordPayload,
  SelectOption,
  ChecklistGroupDef,
  COMORBIDITY_GROUPS,
  PHYSICAL_EXAM_GROUPS,
  DRUG_OPTIONS,
  ALLERGY_OPTIONS,
  CONDUCT_OPTIONS,
  LATERALITY_OPTIONS,
  ASA_OPTIONS,
  MUCOSA_OPTIONS,
  DENTITION_OPTIONS,
  INTER_INCISOR_DISTANCE_OPTIONS,
  UPPER_INCISOR_LENGTH_OPTIONS,
  MALLAMPATI_OPTIONS,
  INCISOR_RELATION_OPTIONS,
  PALATE_OPTIONS,
  NECK_LENGTH_OPTIONS,
  NECK_WIDTH_OPTIONS,
  STERNOMENTAL_DISTANCE_OPTIONS,
  THYROMENTAL_DISTANCE_OPTIONS,
  HUAP_SPECIALTY_OPTIONS,
} from './pre-anesthesic-record.model';
import { RecordData, RecordSection } from '../components/record-viewer-modal/record-viewer-modal.component';
import { formatDateBR, formatDateTimeBR } from '../utils/date-format.util';

function labelFor(value: string | number | null | undefined, options: SelectOption<any>[]): string | null {
  if (value === null || value === undefined || value === '') 
    return null;
  const found = options.find(o => String(o.value) === String(value));
  return found ? found.label : String(value);
}

function labelsFor(values: string[] | null | undefined, options: ChecklistOption[]): string | null {
  if (!values || values.length === 0) 
    return null;
  return values.map(key => options.find(o => o.key === key)?.label ?? key).join(', ');
}

function labelsForFinding(finding: PreAnesthesicChecklistFinding | undefined, group: ChecklistGroupDef): string | null {
  if (!finding) return null;
  const parts: string[] = (finding.findings ?? []).map(key => {
    const opt = group.options.find(o => o.key === key);
    return opt ? opt.label : key;
  });
  if (finding.otherDescription) parts.push(`Outros: ${finding.otherDescription}`);
  if (finding.observations) parts.push(`Obs: ${finding.observations}`);
  return parts.length > 0 ? parts.join('; ') : null;
}

export function mapPreAnesthesiaToRecordData(payload: PreAnesthesicRecordPayload | PreAnesthesicRecordDraft): RecordData {
  const sections: RecordSection[] = [];
  const signed = payload as Partial<PreAnesthesicRecordPayload>;

  const add = (title: string, fields: { label: string; value: string | number | null | undefined }[]) => {
    const validFields = fields.filter(f => f.value !== null && f.value !== undefined && f.value !== '');
    if (validFields.length > 0) {
      sections.push({ title, fields: validFields as { label: string; value: string | number }[] });
    }
  };

  const proc = payload.procedure;
  if (proc) {
    add('Procedimento', [
      { label: 'Cirurgias', value: proc.surgeries?.map(s => s.name).join(', ') },
      { label: 'Lateralidade', value: labelFor(proc.laterality, LATERALITY_OPTIONS) },
      { label: 'Diagnóstico Pré-Operatório', value: proc.preOperativeDiagnosis },
      { label: 'Data da Consulta', value: formatDateBR(proc.consultationDate) },
      { label: 'Observação', value: proc.observation }
    ]);
  }

  const antro = payload.anthropometry;
  if (antro) {
    add('Antropometria e Sinais Vitais', [
      { label: 'Peso (Kg)', value: antro.weightKg },
      { label: 'Altura (cm)', value: antro.heightCm },
      { label: 'IMC', value: antro.bmi },
      { label: 'Frequência Cardíaca (bpm)', value: antro.heartRate },
      { label: 'Pressão Sistólica (mmHg)', value: antro.systolicBloodPressure },
      { label: 'Pressão Diastólica (mmHg)', value: antro.diastolicBloodPressure },
      { label: 'SpO2 (%)', value: antro.spo2 },
      { label: 'Temperatura (°C)', value: antro.temperature },
      { label: 'Jejum Sólidos (h)', value: antro.fastingSolidsHours },
      { label: 'Jejum Líquidos (h)', value: antro.fastingLiquidsHours }
    ]);
  }

  const hab = payload.habits;
  if (hab) {
    add('Hábitos', [
      { label: 'Tabagista', value: hab.smoker ? 'Sim' : (hab.smoker === false ? 'Não' : null) },
      { label: 'Carga Tabágica', value: hab.smokingLoad },
      { label: 'Uso de Álcool', value: hab.alcoholUse ? 'Sim' : (hab.alcoholUse === false ? 'Não' : null) },
      { label: 'Gramas de Álcool/dia', value: hab.alcoholGramsPerDay },
      { label: 'Uso de Drogas Ilícitas', value: hab.illicitDrugUse ? 'Sim' : (hab.illicitDrugUse === false ? 'Não' : null) },
      { label: 'Tipos de Drogas', value: labelsFor(hab.drugTypes, DRUG_OPTIONS) },
      { label: 'Outras drogas', value: hab.drugsOtherDescription }
    ]);
  }

  const alerg = payload.allergies;
  if (alerg) {
    add('Alergias e Reações', [
      { label: 'Possui Alergia', value: alerg.hasAllergy ? 'Sim' : (alerg.hasAllergy === false ? 'Não' : null) },
      { label: 'Substâncias', value: labelsFor(alerg.substances, ALLERGY_OPTIONS) },
      { label: 'Outras', value: alerg.otherDescription },
      { label: 'Tipo de Reação', value: alerg.reactionType },
      { label: 'Histórico Anestésico', value: alerg.anestheticHistory }
    ]);
  }

  if (payload.comorbidities || payload.comorbiditiesOtherDescription || payload.familyHistory) {
    const comorbFields = COMORBIDITY_GROUPS.map(group => ({
      label: group.title,
      value: labelsForFinding(payload.comorbidities?.[group.key], group),
    }));
    comorbFields.push({ label: 'Outras comorbidades', value: payload.comorbiditiesOtherDescription || null });
    comorbFields.push({ label: 'Histórico familiar', value: payload.familyHistory || null });
    add('Comorbidades', comorbFields);
  }

  const meds = payload.medicationsInUse;
  if (meds && meds.usesMedication) {
    const medList = meds.items?.map(m => `${m.name} (${m.dose}, ${m.route}, ${m.frequency})`).join('\n') || '';
    add('Medicações em Uso', [
      { label: 'Usa medicações', value: 'Sim' },
      { label: 'Medicamentos', value: medList }
    ]);
  } else if (meds && meds.usesMedication === false) {
    add('Medicações em Uso', [{ label: 'Usa medicações', value: 'Não' }]);
  }

  const phys = payload.physicalExam;
  if (phys) {
    const physFields = PHYSICAL_EXAM_GROUPS.map(group => ({
      label: group.title,
      value: labelsForFinding(phys.areas?.[group.key], group),
    }));
    const airway = phys.airway;
    if (airway) {
      physFields.push(
        { label: 'Mucosas', value: (airway.mucosa ?? []).map(v => labelFor(v, MUCOSA_OPTIONS)).filter(Boolean).join(', ') || null },
        { label: 'Dentição', value: labelFor(airway.dentition, DENTITION_OPTIONS) },
        { label: 'Distância interincisiva', value: labelFor(airway.interIncisorDistance, INTER_INCISOR_DISTANCE_OPTIONS) },
        { label: 'Comprimento do incisivo superior', value: labelFor(airway.upperIncisorLength, UPPER_INCISOR_LENGTH_OPTIONS) },
        { label: 'Classe de Mallampati', value: labelFor(airway.mallampatiClass, MALLAMPATI_OPTIONS) },
        { label: 'Relação incisiva', value: labelFor(airway.incisorRelation, INCISOR_RELATION_OPTIONS) },
        { label: 'Palato', value: labelFor(airway.palate, PALATE_OPTIONS) },
        { label: 'Protrusão mandibular', value: airway.mandibleProtrusion },
        { label: 'Comprimento do pescoço', value: labelFor(airway.neckLength, NECK_LENGTH_OPTIONS) },
        { label: 'Largura do pescoço', value: labelFor(airway.neckWidth, NECK_WIDTH_OPTIONS) },
        { label: 'Distância esternomentoniana', value: labelFor(airway.sternomentalDistance, STERNOMENTAL_DISTANCE_OPTIONS) },
        { label: 'Distância tireomentoniana', value: labelFor(airway.thyromentalDistance, THYROMENTAL_DISTANCE_OPTIONS) },
        { label: 'Flexão do pescoço', value: airway.neckFlexion },
        { label: 'Extensão do pescoço', value: airway.neckExtension },
        { label: 'Complacência do espaço mandibular', value: airway.mandibularSpaceCompliance },
        { label: 'Observações da via aérea', value: airway.observations },
      );
    }
    physFields.push(
      { label: 'Alteração de caixa torácica', value: phys.thoracicCageAbnormality === null || phys.thoracicCageAbnormality === undefined ? null : (phys.thoracicCageAbnormality ? 'Sim' : 'Não') },
      { label: 'Descrição da alteração torácica', value: phys.thoracicCageAbnormalityDescription },
      { label: 'Previsão de intubação difícil', value: phys.difficultIntubationPrediction === null || phys.difficultIntubationPrediction === undefined ? null : (phys.difficultIntubationPrediction ? 'Sim' : 'Não') },
    );
    add('Exame Físico', physFields);
  }

  const labs = payload.labs;
  if (labs) {
    add('Exames Laboratoriais', [
      { label: 'Hemoglobina', value: labs.hemoglobin },
      { label: 'Hematócrito', value: labs.hematocrit },
      { label: 'Leucócitos', value: labs.leukocytes },
      { label: 'Plaquetas', value: labs.platelets },
      { label: 'TAP/INR', value: labs.tapInr },
      { label: 'TP', value: labs.tp },
      { label: 'TTPA', value: labs.aptt },
      { label: 'Glicose', value: labs.glucose },
      { label: 'Ureia', value: labs.urea },
      { label: 'Creatinina', value: labs.creatinine },
      { label: 'Sódio', value: labs.sodium },
      { label: 'Potássio', value: labs.potassium },
      { label: 'Urinálise', value: labs.urinalysis },
      { label: 'Exames Função Hepática', value: labs.liverFunctionTests },
      { label: 'Teste de Gravidez', value: labs.pregnancyTest }
    ]);
  }

  const img = payload.imaging;
  if (img) {
    add('Exames de Imagem', [
      { label: 'ECG', value: img.ecg },
      { label: 'Raio X Toráx', value: img.chestXRay },
      { label: 'Ecocardiograma', value: img.echocardiogram },
      { label: 'Teste Função Pulmonar', value: img.pulmonaryFunctionTest },
      { label: 'Outros', value: img.other }
    ]);
  }

  const reports = payload.reports;
  if (reports && reports.length > 0) {
    add('Pareceres', reports.map((r, i) => ({
      label: labelFor(r.specialty, HUAP_SPECIALTY_OPTIONS) || `Parecer ${i + 1}`,
      value: r.description,
    })));
  }

  const cond = payload.conduct;
  if (cond) {
    add('Conduta e Classificação', [
      { label: 'Classificação ASA', value: labelFor(cond.asaClassification, ASA_OPTIONS) },
      { label: 'Emergência?', value: cond.isEmergency ? 'Sim' : 'Não' },
      { label: 'Não Liberado?', value: cond.notCleared ? 'Sim' : 'Não' },
      { label: 'Motivo Não Liberação', value: cond.notClearedReason },
      { label: 'Condutas', value: labelsFor(cond.actions, CONDUCT_OPTIONS) },
      { label: 'Observações', value: cond.notes }
    ]);
  }

  if (signed.signedByName || signed.signedAt) {
    add('Assinatura', [
      { label: 'Assinado por', value: signed.signedByName },
      { label: 'Assinado em', value: formatDateTimeBR(signed.signedAt) },
    ]);
  }

  return {
    title: 'Ficha Pré-Anestésica',
    sections
  };
}
