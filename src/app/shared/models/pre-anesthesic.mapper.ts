import { PreAnesthesicRecordPayload } from './pre-anesthesic-record.model';
import { RecordData, RecordSection } from '../components/record-viewer-modal/record-viewer-modal.component';

export function mapPreAnesthesiaToRecordData(payload: PreAnesthesicRecordPayload): RecordData {
  const sections: RecordSection[] = [];

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
      { label: 'Lateralidade', value: proc.laterality },
      { label: 'Diagnóstico Pré-Operatório', value: proc.preOperativeDiagnosis },
      { label: 'Data da Consulta', value: proc.consultationDate },
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
      { label: 'Tipos de Drogas', value: hab.drugTypes?.join(', ') }
    ]);
  }

  const alerg = payload.allergies;
  if (alerg) {
    add('Alergias e Reações', [
      { label: 'Possui Alergia', value: alerg.hasAllergy ? 'Sim' : (alerg.hasAllergy === false ? 'Não' : null) },
      { label: 'Substâncias', value: alerg.substances?.join(', ') },
      { label: 'Outras', value: alerg.otherDescription },
      { label: 'Tipo de Reação', value: alerg.reactionType },
      { label: 'Histórico Anestésico', value: alerg.anestheticHistory }
    ]);
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

  const labs = payload.labs;
  if (labs) {
    add('Exames Laboratoriais', [
      { label: 'Hemoglobina', value: labs.hemoglobin },
      { label: 'Hematócrito', value: labs.hematocrit },
      { label: 'Leucócitos', value: labs.leukocytes },
      { label: 'Plaquetas', value: labs.platelets },
      { label: 'TAP/INR', value: labs.tapInr },
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

  const cond = payload.conduct;
  if (cond) {
    add('Conduta e Classificação', [
      { label: 'Classificação ASA', value: cond.asaClassification },
      { label: 'Emergência?', value: cond.isEmergency ? 'Sim' : 'Não' },
      { label: 'Não Liberado?', value: cond.notCleared ? 'Sim' : 'Não' },
      { label: 'Motivo Não Liberação', value: cond.notClearedReason },
      { label: 'Condutas', value: cond.actions?.join(', ') },
      { label: 'Observações', value: cond.notes }
    ]);
  }

  return {
    title: 'Ficha Pré-Anestésica',
    sections
  };
}
