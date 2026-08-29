import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './base/api.service';
import { BaseService } from './base/base.service';
import {
  PreAnesthesicChecklistFinding,
  PreAnesthesicRecordDraft,
  PreAnesthesicRecordPayload,
} from '../../shared/models/pre-anesthesic-record.model';


const PRE_ANESTHESIA_ENDPOINT = 'preAnesthesiaRecord';

const DRAFT_PREFIX = 'draft_pre_anesthesia_';

interface PreAnesthesicDraftEnvelope {
  anesthesiaRecordId: number;
  patientId: string;
  updatedAt: string;
  data: PreAnesthesicRecordDraft;
}


interface PreAnesthesiaChecklistGroupWire {
  groupKey: string;
  findings: string[];
  otherDescription: string | null;
  observations: string | null;
}

function findingToWire(groupKey: string, finding: PreAnesthesicChecklistFinding): PreAnesthesiaChecklistGroupWire {
  return {
    groupKey,
    findings: finding.findings ?? [],
    otherDescription: finding.otherDescription || null,
    observations: finding.observations || null,
  };
}

function wireToFindingRecord(groups: PreAnesthesiaChecklistGroupWire[] | null | undefined): Record<string, PreAnesthesicChecklistFinding> {
  const record: Record<string, PreAnesthesicChecklistFinding> = {};
  for (const group of groups ?? []) {
    record[group.groupKey] = {
      findings: group.findings ?? [],
      otherDescription: group.otherDescription ?? '',
      observations: group.observations ?? '',
    };
  }
  return record;
}

@Injectable({
  providedIn: 'root',
})
export class PreAnesthesicRecordService extends BaseService<PreAnesthesicRecordPayload> {

  constructor(api: ApiService) {
    super(api, PRE_ANESTHESIA_ENDPOINT);
  }


  getByAnesthesiaRecordId(anesthesiaRecordId: number): Observable<PreAnesthesicRecordPayload | null> {
    return this.api.get<any>(`${PRE_ANESTHESIA_ENDPOINT}/by-anesthesia-record/${anesthesiaRecordId}`).pipe(
      map((res) => {
        const data = res?.data ?? res ?? null;
        return data ? this.fromWire(data) : null;
      }),
      catchError((err) => {
        console.warn('[PreAnesthesicRecordService] Avaliação pré-anestésica não encontrada para esta cirurgia.', err);
        return of(null);
      }),
    );
  }


  submit(payload: PreAnesthesicRecordPayload, existingId: number | null): Observable<any> {
    const wireBody = this.toWire(payload);

    if (existingId) {
      return this.api.put<any>(`${PRE_ANESTHESIA_ENDPOINT}/${existingId}`, wireBody);
    }

    return this.api.post<any>(PRE_ANESTHESIA_ENDPOINT, wireBody);
  }

  private toWire(payload: PreAnesthesicRecordPayload): any {
    return {
      anesthesiaRecordId: payload.anesthesiaRecordId,

      surgeries: (payload.procedure.surgeries ?? []).map((s) => ({ name: s.name, isPrimary: s.isPrimary })),
      laterality: payload.procedure.laterality,
      preOperativeDiagnosis: payload.procedure.preOperativeDiagnosis,
      consultationDate: payload.procedure.consultationDate,
      procedureObservation: payload.procedure.observation,

      weightKg: payload.anthropometry.weightKg,
      heightCm: payload.anthropometry.heightCm,
      bmi: payload.anthropometry.bmi,
      heartRate: payload.anthropometry.heartRate,
      systolicBloodPressure: payload.anthropometry.systolicBloodPressure,
      diastolicBloodPressure: payload.anthropometry.diastolicBloodPressure,
      spo2: payload.anthropometry.spo2,
      temperature: payload.anthropometry.temperature,
      fastingSolidsHours: payload.anthropometry.fastingSolidsHours,
      fastingLiquidsHours: payload.anthropometry.fastingLiquidsHours,

      comorbidities: Object.entries(payload.comorbidities ?? {}).map(([key, finding]) => findingToWire(key, finding)),
      comorbiditiesOtherDescription: payload.comorbiditiesOtherDescription,
      familyHistory: payload.familyHistory,

      illicitDrugUse: payload.habits.illicitDrugUse,
      drugTypes: payload.habits.drugTypes ?? [],
      drugsOtherDescription: payload.habits.drugsOtherDescription,
      smoker: payload.habits.smoker,
      smokingLoad: payload.habits.smokingLoad,
      alcoholUse: payload.habits.alcoholUse,
      alcoholGramsPerDay: payload.habits.alcoholGramsPerDay,

      hasAllergy: payload.allergies.hasAllergy,
      allergySubstances: payload.allergies.substances ?? [],
      allergyOtherDescription: payload.allergies.otherDescription,
      allergyReactionType: payload.allergies.reactionType,
      anestheticHistory: payload.allergies.anestheticHistory,

      usesMedication: payload.medicationsInUse.usesMedication,
      medications: (payload.medicationsInUse.items ?? []).map((m) => ({
        name: m.name,
        dose: m.dose,
        route: m.route,
        frequency: m.frequency,
      })),

      physicalExamAreas: Object.entries(payload.physicalExam.areas ?? {}).map(([key, finding]) => findingToWire(key, finding)),
      airwayMucosa: payload.physicalExam.airway.mucosa ?? [],
      dentition: payload.physicalExam.airway.dentition,
      interIncisorDistance: payload.physicalExam.airway.interIncisorDistance,
      upperIncisorLength: payload.physicalExam.airway.upperIncisorLength,
      mallampatiClass: payload.physicalExam.airway.mallampatiClass,
      incisorRelation: payload.physicalExam.airway.incisorRelation,
      palate: payload.physicalExam.airway.palate,
      mandibleProtrusion: payload.physicalExam.airway.mandibleProtrusion,
      neckLength: payload.physicalExam.airway.neckLength,
      neckWidth: payload.physicalExam.airway.neckWidth,
      sternomentalDistance: payload.physicalExam.airway.sternomentalDistance,
      thyromentalDistance: payload.physicalExam.airway.thyromentalDistance,
      neckFlexion: payload.physicalExam.airway.neckFlexion,
      neckExtension: payload.physicalExam.airway.neckExtension,
      mandibularSpaceCompliance: payload.physicalExam.airway.mandibularSpaceCompliance,
      airwayObservations: payload.physicalExam.airway.observations,
      thoracicCageAbnormality: payload.physicalExam.thoracicCageAbnormality,
      thoracicCageAbnormalityDescription: payload.physicalExam.thoracicCageAbnormalityDescription,
      difficultIntubationPrediction: payload.physicalExam.difficultIntubationPrediction,

      hemoglobin: payload.labs.hemoglobin,
      hematocrit: payload.labs.hematocrit,
      leukocytes: payload.labs.leukocytes,
      platelets: payload.labs.platelets,
      tapInr: payload.labs.tapInr,
      aptt: payload.labs.aptt,
      glucose: payload.labs.glucose,
      urea: payload.labs.urea,
      creatinine: payload.labs.creatinine,
      sodium: payload.labs.sodium,
      potassium: payload.labs.potassium,
      tp: payload.labs.tp,
      urinalysis: payload.labs.urinalysis,
      liverFunctionTests: payload.labs.liverFunctionTests,
      pregnancyTest: payload.labs.pregnancyTest,

      ecg: payload.imaging.ecg,
      chestXRay: payload.imaging.chestXRay,
      echocardiogram: payload.imaging.echocardiogram,
      pulmonaryFunctionTest: payload.imaging.pulmonaryFunctionTest,
      otherImaging: payload.imaging.other,

      reports: (payload.reports ?? []).map((r) => ({ specialty: r.specialty, description: r.description })),

      asaClassification: payload.conduct.asaClassification,
      isEmergency: payload.conduct.isEmergency,
      notCleared: payload.conduct.notCleared,
      notClearedReason: payload.conduct.notClearedReason,
      conductActions: payload.conduct.actions ?? [],
      conductNotes: payload.conduct.notes,

      signedByProfessionalId: payload.signedByProfessionalId,
      signedByName: payload.signedByName,
      signedAt: payload.signedAt,
    };
  }


  private fromWire(wire: any): PreAnesthesicRecordPayload {
    return {
      id: wire.id,
      anesthesiaRecordId: wire.anesthesiaRecordId ?? null,
      patientId: wire.patientId ?? null,
      firstAnesthesiologistId: wire.firstAnesthesiologistId ?? null,

      procedure: {
        surgeries: (wire.surgeries ?? []).map((s: any) => ({ name: s.name, isPrimary: s.isPrimary })),
        laterality: wire.laterality ?? null,
        preOperativeDiagnosis: wire.preOperativeDiagnosis ?? '',
        consultationDate: wire.consultationDate ?? '',
        observation: wire.procedureObservation ?? '',
      },
      anthropometry: {
        weightKg: wire.weightKg ?? null,
        heightCm: wire.heightCm ?? null,
        bmi: wire.bmi ?? null,
        heartRate: wire.heartRate ?? null,
        systolicBloodPressure: wire.systolicBloodPressure ?? null,
        diastolicBloodPressure: wire.diastolicBloodPressure ?? null,
        spo2: wire.spo2 ?? null,
        temperature: wire.temperature ?? null,
        fastingSolidsHours: wire.fastingSolidsHours ?? null,
        fastingLiquidsHours: wire.fastingLiquidsHours ?? null,
      },
      comorbidities: wireToFindingRecord(wire.comorbidities),
      comorbiditiesOtherDescription: wire.comorbiditiesOtherDescription ?? '',
      familyHistory: wire.familyHistory ?? '',
      habits: {
        illicitDrugUse: wire.illicitDrugUse ?? null,
        drugTypes: wire.drugTypes ?? [],
        drugsOtherDescription: wire.drugsOtherDescription ?? '',
        smoker: wire.smoker ?? null,
        smokingLoad: wire.smokingLoad ?? '',
        alcoholUse: wire.alcoholUse ?? null,
        alcoholGramsPerDay: wire.alcoholGramsPerDay ?? '',
      },
      allergies: {
        hasAllergy: wire.hasAllergy ?? null,
        substances: wire.allergySubstances ?? [],
        otherDescription: wire.allergyOtherDescription ?? '',
        reactionType: wire.allergyReactionType ?? '',
        anestheticHistory: wire.anestheticHistory ?? '',
      },
      medicationsInUse: {
        usesMedication: wire.usesMedication ?? null,
        items: (wire.medications ?? []).map((m: any) => ({
          name: m.name ?? '',
          dose: m.dose ?? '',
          route: m.route ?? '',
          frequency: m.frequency ?? '',
        })),
      },
      physicalExam: {
        areas: wireToFindingRecord(wire.physicalExamAreas),
        airway: {
          mucosa: wire.airwayMucosa ?? [],
          dentition: wire.dentition ?? null,
          interIncisorDistance: wire.interIncisorDistance ?? null,
          upperIncisorLength: wire.upperIncisorLength ?? null,
          mallampatiClass: wire.mallampatiClass ?? null,
          incisorRelation: wire.incisorRelation ?? null,
          palate: wire.palate ?? null,
          mandibleProtrusion: wire.mandibleProtrusion ?? null,
          neckLength: wire.neckLength ?? null,
          neckWidth: wire.neckWidth ?? null,
          sternomentalDistance: wire.sternomentalDistance ?? null,
          thyromentalDistance: wire.thyromentalDistance ?? null,
          neckFlexion: wire.neckFlexion ?? null,
          neckExtension: wire.neckExtension ?? null,
          mandibularSpaceCompliance: wire.mandibularSpaceCompliance ?? null,
          observations: wire.airwayObservations ?? '',
        },
        thoracicCageAbnormality: wire.thoracicCageAbnormality ?? null,
        thoracicCageAbnormalityDescription: wire.thoracicCageAbnormalityDescription ?? '',
        difficultIntubationPrediction: wire.difficultIntubationPrediction ?? null,
      },
      labs: {
        hemoglobin: wire.hemoglobin ?? null,
        hematocrit: wire.hematocrit ?? null,
        leukocytes: wire.leukocytes ?? null,
        platelets: wire.platelets ?? null,
        tapInr: wire.tapInr ?? null,
        aptt: wire.aptt ?? null,
        glucose: wire.glucose ?? null,
        urea: wire.urea ?? null,
        creatinine: wire.creatinine ?? null,
        sodium: wire.sodium ?? null,
        potassium: wire.potassium ?? null,
        tp: wire.tp ?? '',
        urinalysis: wire.urinalysis ?? '',
        liverFunctionTests: wire.liverFunctionTests ?? '',
        pregnancyTest: wire.pregnancyTest ?? '',
      },
      imaging: {
        ecg: wire.ecg ?? '',
        chestXRay: wire.chestXRay ?? '',
        echocardiogram: wire.echocardiogram ?? '',
        pulmonaryFunctionTest: wire.pulmonaryFunctionTest ?? '',
        other: wire.otherImaging ?? '',
      },
      reports: (wire.reports ?? []).map((r: any) => ({ specialty: r.specialty ?? '', description: r.description ?? '' })),
      conduct: {
        asaClassification: wire.asaClassification ?? null,
        isEmergency: !!wire.isEmergency,
        notCleared: !!wire.notCleared,
        notClearedReason: wire.notClearedReason ?? '',
        actions: wire.conductActions ?? [],
        notes: wire.conductNotes ?? '',
      },
      signedByProfessionalId: wire.signedByProfessionalId ?? null,
      signedByName: wire.signedByName ?? '',
      signedAt: wire.signedAt ?? '',
    } as PreAnesthesicRecordPayload;
  }

  // --- Rascunho local (localStorage) ---------------------------------
  // Mantido como estava (ver monitorizacao/ficha-anestesica para o mesmo
  // padrão): o rascunho é local e best-effort, não depende do backend, e
  // continua funcionando exatamente como antes — só a CHAVE muda, para
  // incorporar o anesthesiaRecordId e não colidir entre cirurgias
  // diferentes do mesmo paciente.

  private draftKey(anesthesiaRecordId: number, patientId: string): string {
    return `${DRAFT_PREFIX}${anesthesiaRecordId}_${patientId}`;
  }

  saveDraft(anesthesiaRecordId: number, patientId: string, draft: PreAnesthesicRecordDraft): void {
    try {
      const envelope: PreAnesthesicDraftEnvelope = {
        anesthesiaRecordId,
        patientId,
        updatedAt: new Date().toISOString(),
        data: draft,
      };
      localStorage.setItem(this.draftKey(anesthesiaRecordId, patientId), JSON.stringify(envelope));
    } catch {
      // localStorage indisponível (ex.: modo privado) — rascunho local é best-effort.
    }
  }

  getDraft(anesthesiaRecordId: number, patientId: string): PreAnesthesicRecordDraft | null {
    try {
      const raw = localStorage.getItem(this.draftKey(anesthesiaRecordId, patientId));
      if (!raw) return null;
      const envelope: PreAnesthesicDraftEnvelope = JSON.parse(raw);
      return envelope?.data ?? null;
    } catch {
      return null;
    }
  }

  clearDraft(anesthesiaRecordId: number, patientId: string): void {
    localStorage.removeItem(this.draftKey(anesthesiaRecordId, patientId));
  }

  hasDraft(anesthesiaRecordId: number, patientId: string): boolean {
    return localStorage.getItem(this.draftKey(anesthesiaRecordId, patientId)) !== null;
  }

  getBestAvailable(anesthesiaRecordId: number, patientId: string): PreAnesthesicRecordDraft | PreAnesthesicRecordPayload | null {
    const draft = this.getDraft(anesthesiaRecordId, patientId);
    if (draft) return draft;
    try {
      const raw = localStorage.getItem(`preAnesthesiaData_${anesthesiaRecordId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
