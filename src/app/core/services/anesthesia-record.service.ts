import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { ApiService } from "./base/api.service";
import { BaseService } from "./base/base.service";
import { AnesthesiaRecordModel } from "../../shared/models/anesthesia-record.model";
import { from, interval, Observable, of, Subscription } from "rxjs";
import { catchError, concatMap, delay, map, startWith } from "rxjs/operators";
import { BehaviorSubject } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AnesthesiaRecordService extends BaseService<AnesthesiaRecordModel> {

  private pendingDraftsCountSubject = new BehaviorSubject<number>(0);
  pendingDraftsCount$ = this.pendingDraftsCountSubject.asObservable();

  private syncingSubject = new BehaviorSubject<boolean>(false);
  syncing$ = this.syncingSubject.asObservable();

  private autoSyncSubscription?: Subscription;
  private syncing = false;
  private serverOnline = true;

  private readonly DRAFT_PREFIX = 'draft_anesthesia_';

  private readonly POSITION_MAP: Record<number, string> = {
    1: 'SUPINA',
    2: 'PRONA',
    3: 'SENTADO',
    4: 'LATERAL ESQUERDO',
    5: 'LATERAL DIREITO',
    6: 'TRENDELENBURG',
    7: 'LITOTÔMICA'
  };

  private readonly POSITION_REVERSE_MAP: Record<string, number> = {
    'SUPINA': 1,
    'PRONA': 2,
    'SENTADO': 3,
    'LATERAL ESQUERDO': 4,
    'LATERAL DIREITO': 5,
    'TRENDELENBURG': 6,
    'LITOTÔMICA': 7
  };

  private readonly VENOUS_ACCESS_MAP: Record<number, string> = {
    1: 'Periferico',
    2: 'Central'
  };

  private readonly VENOUS_ACCESS_REVERSE_MAP: Record<string, number> = {
    'Periferico': 1,
    'Central': 2
  };

  private readonly CLINICAL_CONDITION_MAP: Record<number, string> = {
    1: 'Acordado',
    2: 'Sonolento',
    3: 'Intubado'
  };

  private readonly CLINICAL_CONDITION_REVERSE_MAP: Record<string, number> = {
    'Acordado': 1,
    'Sonolento': 2,
    'Intubado': 3
  };

  private readonly ROMAN_TO_NUMBER: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6
  };

  constructor(api: ApiService) {
    super(api, 'anesthesiarecord');
    this.updatePendingStatus();
  }

  saveRecord(record: any): Observable<any> {
    const surgeryId = Number(record.cirurgiaId);
    const apiPayload = this.mapToApiFormat(record, surgeryId);
    return this.update(surgeryId, apiPayload).pipe(
      map(response => ({ response, surgeryId }))
    );
  }

  syncPendingDrafts(): void {
    if (this.syncing)
      return;

    this.syncing = true;
    this.startSync();

    const drafts = this.getPendingDrafts();

    from(drafts)
      .pipe(
        concatMap(draft =>
          this.saveRecord(draft).pipe(
            catchError(error => {
              console.error('Erro ao sincronizar ficha', draft, error);
              return of(null);
            })
          )
        ),
        finalize(() => {
          this.syncing = false;
          this.finishSync();
        })
      )
      .subscribe(result => {
        if (!result) return;
        this.clearDraft(result.surgeryId.toString());
      });
  }

  private getPendingDrafts(): any[] {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.DRAFT_PREFIX))
      .map(key => JSON.parse(localStorage.getItem(key)!));
  }

  setServerStatus(isOnline: boolean): void {
    this.serverOnline = isOnline;
  }

  startAutoSync(): void {
    if (this.autoSyncSubscription) return;
    this.autoSyncSubscription = interval(10000)
      .pipe(startWith(0))
      .subscribe(() => {
        if (!navigator.onLine)
          return;

        if (!this.serverOnline)
          return;

        if (this.getPendingDraftsCount() === 0)
          return;
        this.syncPendingDrafts();
      });
  }

  stopAutoSync(): void {
    this.autoSyncSubscription?.unsubscribe();
    this.autoSyncSubscription = undefined;
  }

  getLatestByPatient(id: string, patientId: string): Observable<any | null> {
    return new Observable(obs => {
      this.getByIds(Number(id), patientId).subscribe({
        next: (apiResponse: any) => {
          if (apiResponse && apiResponse.data) {
            const mappedForm = this.mapToAppFormat(apiResponse.data);
            obs.next(mappedForm);
          } else {
            obs.next(null);
          }
          obs.complete();
        },
        error: (err) => {
          console.error('Erro ao buscar dados do paciente:', err);
          obs.next(null);
          obs.complete();
        }
      });
    });
  }

  private updatePendingStatus(): void {
    const count = Object.keys(localStorage)
      .filter(key => key.startsWith(this.DRAFT_PREFIX)).length;
    this.pendingDraftsCountSubject.next(count);
  }

  refreshPendingDrafts(): void {
    this.updatePendingStatus();
  }

  startSync(): void {
    this.syncingSubject.next(true);
  }

  finishSync(): void {
    this.syncingSubject.next(false);
  }

  getPendingDraftsCount(): number {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.DRAFT_PREFIX)).length;
  }

  createBlankRecord(surgeryId: number): Observable<any> {
    const apiPayload = this.mapToApiFormat({}, surgeryId);
    return this.create(apiPayload);
  }

  clearLatestRecord(pacienteId: string): Observable<boolean> {
    this.clearDraft(pacienteId);
    return of(true).pipe(delay(100));
  }

  saveDraft(pacienteId: string, record: any): void {

    localStorage.setItem(`draft_anesthesia_${pacienteId}`, JSON.stringify({
      ...record,
      pacienteId,
      updatedAt: new Date().toISOString()
    }));
    this.updatePendingStatus();
  }

  getDraft(pacienteId: string): any {
    const draft = localStorage.getItem(`draft_anesthesia_${pacienteId}`);
    return draft ? JSON.parse(draft) : null;
  }

  clearDraft(pacienteId: string): void {
    localStorage.removeItem(`draft_anesthesia_${pacienteId}`);
    this.updatePendingStatus();
  }

  getPdfUrl(id: number): string {
    return `${environment.apiUrl}/AnesthesiaRecord/${id}/print`;
  }

  private formatTimeForApi(timeStr: string | undefined | null): string {
    if (!timeStr) return '00:00:00';
    if (timeStr.includes('T')) {
      const timePart = timeStr.split('T')[1];
      return timePart.substring(0, 8);
    }
    if (timeStr.length === 5 && timeStr.includes(':')) {
      return `${timeStr}:00`;
    }
    return timeStr.substring(0, 8);
  }

  private formatTimeForApp(timeStr: string | undefined | null): string {
    if (!timeStr) return '';
    if (timeStr.length >= 8) {
      return timeStr.substring(0, 5);
    }
    return timeStr;
  }

  private pick<T>(...values: T[]): T | undefined {
    for (const v of values) {
      if (v !== undefined && v !== null)
        return v;
    }
    return undefined;
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined)
      return 0;

    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  private parseBoolean(value: any): boolean {
    if (value === null || value === undefined)
      return false;

    if (typeof value === 'boolean')
      return value;

    if (typeof value === 'string')
      return value.toLowerCase() === 'true' || value === '1';

    return Boolean(value);
  }

  private mapToApiFormat(app: any, surgeryId: number): any {
    const todayDate = new Date().toISOString().split('T')[0];

    let parsedAsa = 1;
    const asaValue = app.dadosVitais?.asa;
    if (asaValue) {
      if (typeof asaValue === 'string') {
        const match = asaValue.match(/\d+/);
        if (match) {
          parsedAsa = parseInt(match[0], 10);
        } else {
          const romanMatch = asaValue.match(/ASA\s*([IVX]+)/i);
          if (romanMatch) {
            const roman = romanMatch[1].toUpperCase();
            parsedAsa = this.ROMAN_TO_NUMBER[roman] || 1;
          }
        }
      } else {
        parsedAsa = Number(asaValue) || 1;
      }
    }
    parsedAsa = Math.min(Math.max(parsedAsa, 1), 6);

    let surgeries = [];

    if (Array.isArray(app.cirurgias) && app.cirurgias.length > 0) {
      surgeries = app.cirurgias.map((p: any) => ({
        id: p.id ?? p.procedimentoId ?? null,
        description: p.description ?? p.descricao ?? '',
        cid: p.cid ?? null,
        time: this.formatTimeForApi(p.hora),
        isPrimary: !!(p.isPrimary ?? p.principal)
      }));
    }
    else if (Array.isArray(app.posProcedimento?.procedimentos) && app.posProcedimento.procedimentos.length > 0) {
      surgeries = app.posProcedimento.procedimentos
        .filter((p: any) => p.procedimentoId)
        .map((p: any) => ({
          id: p.id ?? p.procedimentoId ?? null,
          description: p.description ?? p.descricao ?? '',
          cid: p.cid ?? null,
          time: this.formatTimeForApi(p.hora),
          isPrimary: !!(p.isPrimary ?? p.principal)
        }));
    }
    else if (Array.isArray(app.patient?.surgeries)) {
      for (const surgery of app.patient.surgeries) {
        if (Array.isArray(surgery.procedures)) {
          for (const proc of surgery.procedures) {
            surgeries.push({
              id: proc.id ?? proc.procedureId ?? null,
              description: proc.description ?? '',
              cid: proc.cid ?? null,
              time: this.formatTimeForApi(proc.time ?? proc.hora),
              isPrimary: !!proc.isPrimary
            });
          }
        }
      }
    }

    const principal = surgeries.find((c: any) => c.isPrimary) || surgeries[0] || null;
    const firstAnesthesiologistId = this.pick(app.firstAnesthesiologistId, app.assinaturas?.primeiroAnestesistaId, 0);

    const firstAnesthesiologistName = this.pick(
      app.firstAnesthesiologistName,
      app.assinaturas?.primeiroAnestesista, '');
    const secondAnesthesiologistId = this.pick(
      app.secondAnesthesiologistId,
      app.assinaturas?.segundoAnestesistaId, null);
    const secondAnesthesiologistName = this.pick(
      app.secondAnesthesiologistName,
      app.assinaturas?.segundoAnestesista, null);

    const preMed = app.preInducao || {};
    const preAnestheticMedicationId = this.pick(preMed.medication?.id, preMed.farmacoId, null);
    const preAnestheticMedicationName = this.pick(preMed.medication?.name, preMed.farmaco, '') || '';
    const preAnestheticMedicationDose = preMed.dose ?? preMed.dosagem ?? '';
    const preAnestheticMedicationRoute = preMed.via ?? '';
    const preAnestheticMedicationOtherRoute = preMed.outrasVia ?? '';
    const preAnestheticMedicationTime = this.formatTimeForApi(preMed.hora);

    const antibioticsRaw = Array.isArray(app.antibioticsList) ? app.antibioticsList : [];
    const antibioticsList = antibioticsRaw.map((atb: any) => ({
      medicationId: atb.medicationId ?? null,
      medicationName: atb.medicationName ?? atb.nome ?? '',
      name: atb.medicationName ?? atb.nome ?? '',
      dose: atb.dose ?? '',
      route: atb.via ?? '',
      time: this.formatTimeForApi(atb.hora),
      hasBooster: (atb.temRepique === 'sim') || (Array.isArray(atb.repiques) && atb.repiques.length > 0),
      boosters: Array.isArray(atb.repiques) ? atb.repiques.map((r: any) => ({
        medicationId: r.medicationId ?? atb.medicationId ?? null,
        medicationName: r.medicationName ?? atb.medicationName ?? atb.nome ?? '',
        name: r.medicationName ?? atb.medicationName ?? atb.nome ?? '',
        dose: r.dose ?? '',
        route: r.via ?? atb.via ?? '',
        time: this.formatTimeForApi(r.hora)
      })) : []
    }));

    const positionArray = Array.isArray(app.posicao?.posicoes) ? app.posicao.posicoes : [];
    const surgicalPosition = positionArray.length > 0
      ? (this.POSITION_REVERSE_MAP[positionArray[0]] || 1)
      : 1;

    const venousAccessArray = Array.isArray(app.posicao?.acessoVenoso) ? app.posicao.acessoVenoso : [];
    const venousAccessType = venousAccessArray.length > 0
      ? (this.VENOUS_ACCESS_REVERSE_MAP[venousAccessArray[0]] || 1)
      : 1;

    const respAssistida = Array.isArray(app.tecnica?.respiracaoAssistida) ? app.tecnica.respiracaoAssistida : [];
    const respControlada = Array.isArray(app.tecnica?.respiracaoControlada) ? app.tecnica.respiracaoControlada : [];

    let respirationMode = 1;

    if (respControlada.length > 0)
      respirationMode = 2;
    else if (respAssistida.length > 0)
      respirationMode = 1;

    let airwayType = 1;
    if (app.tecnica?.tipoOutras) airwayType = 4;
    else if (app.tecnica?.tipoEndobronquico) airwayType = 2;
    else if (app.tecnica?.tipoAramado) airwayType = 3;


    const condicoesAltaArray = Array.isArray(app.alderete?.condicoesClinicasAlta) ? app.alderete.condicoesClinicasAlta : [];
    let clinicalDischargeCondition = 1;
    if (condicoesAltaArray.length > 0) {
      clinicalDischargeCondition = this.CLINICAL_CONDITION_REVERSE_MAP[condicoesAltaArray[0]] || 1;
    }

    let surgeonId = null;
    let assistantId = null;

    const cirurgiaoValue = app.equipe?.cirurgiao;
    if (cirurgiaoValue) {
      if (typeof cirurgiaoValue === 'string') {
        surgeonId = parseInt(cirurgiaoValue, 10);
      } else if (typeof cirurgiaoValue === 'object' && cirurgiaoValue !== null) {
        surgeonId = cirurgiaoValue.id ? parseInt(cirurgiaoValue.id, 10) : null;
      }
    }
    if (!surgeonId && app.surgeonId) {
      surgeonId = typeof app.surgeonId === 'string' ? parseInt(app.surgeonId, 10) : app.surgeonId;
    }

    const assistenteValue = app.equipe?.assistente;
    if (assistenteValue) {
      if (typeof assistenteValue === 'string') {
        assistantId = parseInt(assistenteValue, 10);
      } else if (typeof assistenteValue === 'object' && assistenteValue !== null) {
        assistantId = assistenteValue.id ? parseInt(assistenteValue.id, 10) : null;
      }
    }
    if (!assistantId && app.assistantId) {
      assistantId = typeof app.assistantId === 'string' ? parseInt(app.assistantId, 10) : app.assistantId;
    }

    let secondAnesthesiologistIdValue = null;
    const segundoValue = app.assinaturas?.segundoAnestesista;
    if (segundoValue) {
      if (typeof segundoValue === 'string') {
        secondAnesthesiologistIdValue = parseInt(segundoValue, 10);
      } else if (typeof segundoValue === 'object' && segundoValue !== null) {
        secondAnesthesiologistIdValue = segundoValue.id ? parseInt(segundoValue.id, 10) : null;
      }
    }
    if (!secondAnesthesiologistIdValue && app.secondAnesthesiologistId) {
      secondAnesthesiologistIdValue = typeof app.secondAnesthesiologistId === 'string'
        ? parseInt(app.secondAnesthesiologistId, 10)
        : app.secondAnesthesiologistId;
    }

    return {
      id: surgeryId,
      surgeryId: surgeryId,
      patientId: app.patientId || null,
      recordDate: app.recordDate || todayDate,
      surgeryDate: app.surgeryDate || todayDate,
      surgeries: surgeries,
      patientIdentifiedBeforeInduction: app.seguranca?.identificadoAvaliado === 'sim',
      anestheticConsentSigned: app.seguranca?.consentimentoAssinado === 'sim',
      anesthesiaEquipmentChecked: app.seguranca?.equipamentosChecados === 'sim',
      safetyObservations: app.seguranca?.atencao || '',
      preAnestheticMedication: app.preInducao?.recebeuMedPrevia === 'sim',
      preAnestheticMedicationId,
      preAnestheticMedicationName,
      preAnestheticMedicationDose,
      preAnestheticMedicationRoute,
      preAnestheticMedicationOtherRoute,
      preAnestheticMedicationTime,
      prophylacticAntibioticUsed: app.antibiotico?.temAntibiotico === 'sim',
      antibioticsList,
      bloodPressure: app.dadosVitais?.pa || '',
      respiratoryRate: this.parseNumber(app.dadosVitais?.fr),
      temperature: this.parseNumber(app.dadosVitais?.temp),
      oxygenSaturation: this.parseNumber(app.dadosVitais?.spo2),
      weightKg: this.parseNumber(app.dadosVitais?.peso),
      asaClassification: parsedAsa,
      roomEntryTime: this.formatTimeForApi(app.dadosVitais?.entradaSala),
      anesthesiaStartTime: this.formatTimeForApi(app.equipe?.horaInicioAnestesia),
      surgeonId: surgeonId,
      assistantId: assistantId,
      preOperativeDiagnosis: app.equipe?.diagnosticoPre || '',
      surgicalPosition: surgicalPosition,
      usesCushions: app.posicao?.usoCoxim === 'sim',
      cushionsAccessLocation: app.posicao?.localCoxim || '',
      venousAccessType: venousAccessType,
      venousAccessLocation: app.posicao?.localAcesso || '',
      difficultVenousPuncture: app.posicao?.dificuldadePuncao === 'sim',
      generalAnesthesia: app.tecnica?.anestesiaGeral === 'sim',
      respirationMode: respirationMode,
      controlledVentilationMode: respirationMode === 2 ? 1 : 1,
      co2AbsorberCircuit: app.tecnica?.circuitoAbsorvedor === 'sim',
      airwayDeviceType: app.tecnica?.vaTubo ? 4 : app.tecnica?.vaMascLaringea ? 2 : app.tecnica?.vaMascFacial ? 3 : 1,
      airwayDeviceNumber: app.tecnica?.tuboNo || "7.5",
      oralTube: app.tecnica?.oral || false,
      nasalTube: app.tecnica?.nasal || false,
      intubationDifficulty: app.tecnica?.dificil ? 2 : 1,
      airwayType: airwayType,
      otherAirwayTypeDescription: app.tecnica?.tipoOutrasTexto || null,
      laryngoscopy: app.tecnica?.tecLaringoscopia || false,
      retrogradeTechnique: app.tecnica?.tecRetrograda || false,
      videoLaryngoscopy: app.tecnica?.tecVideolaringoscopia || false,
      bronchofibroscopy: app.tecnica?.tecBroncofibroscopia || false,
      tracheostomy: app.tecnica?.tecTraqueostomia || false,
      otherAirwayTechnique: app.tecnica?.tecVAOutrasTexto || null,
      spinalBlockPerformed: app.tecnica?.bloqueiosEspinhais === 'sim',
      sedationPerformed: app.tecnica?.sedacao === 'sim',
      oxygenSupplementation: app.tecnica?.suplementacaoO2 === 'sim',
      plexusBlockPerformed: app.tecnica?.bloqueioPlexo === 'sim',
      surgeryPerformed: this.pick(
        app.surgeryPerformed,
        principal?.description,
        app.posProcedimento?.cirurgiaRealizada,
        ''
      ) || '',
      surgeryEndTime: this.formatTimeForApi(app.posProcedimento?.horaTerminoCirurgia),
      postOperativeDiagnosis: app.posProcedimento?.diagnosticoPos || '',
      anesthesiaEndTime: this.formatTimeForApi(app.posProcedimento?.horaTerminoAnestesia),
      consciousnessScore: this.parseNumber(app.alderete?.consciencia),
      activityScore: this.parseNumber(app.alderete?.atividade),
      circulationScore: this.parseNumber(app.alderete?.circulacao),
      respirationScore: this.parseNumber(app.alderete?.respiracao),
      oxygenSaturationScore: this.parseNumber(app.alderete?.saturacao),
      totalAldreteKroulikScore: this.parseNumber(app.alderete?.consciencia) +
        this.parseNumber(app.alderete?.atividade) +
        this.parseNumber(app.alderete?.circulacao) +
        this.parseNumber(app.alderete?.respiracao) +
        this.parseNumber(app.alderete?.saturacao),
      clinicalDischargeCondition: clinicalDischargeCondition,
      destination: 1,
      hasPain: app.alderete?.dor === 'sim',
      dorUsouENV: this.parseBoolean(app.alderete?.dorUsouENV),
      dorENV: this.parseNumber(app.alderete?.dorENV),
      dorUsouPAINAD: this.parseBoolean(app.alderete?.dorUsouPAINAD),
      dorPAINAD: this.parseNumber(app.alderete?.dorPAINAD),
      dorUsouBPS: this.parseBoolean(app.alderete?.dorUsouBPS),
      dorBPS: this.parseNumber(app.alderete?.dorBPS),
      conduta: app.alderete?.conduta || '',

      firstAnesthesiologistId: firstAnesthesiologistId ?? 0,
      firstAnesthesiologistName: firstAnesthesiologistName ?? '',
      secondAnesthesiologistId: secondAnesthesiologistIdValue,
      secondAnesthesiologistName: secondAnesthesiologistName ?? null
    };
  }


  private mapToAppFormat(api: any): any {
    const antibioticsList = Array.isArray(api.antibioticsList) ? api.antibioticsList.map((a: any) => ({
      medicationId: a.medicationId ?? null,
      medicationName: a.medicationName ?? a.name ?? '',
      nome: a.medicationName ?? a.name ?? '',
      dose: a.dose ?? '',
      via: a.route ?? a.via ?? 'IV',
      hora: this.formatTimeForApp(a.time ?? a.hora),
      temRepique: a.hasBooster ? 'sim' : 'nao',
      repiques: Array.isArray(a.boosters) ? a.boosters.map((r: any) => ({
        medicationId: r.medicationId ?? a.medicationId ?? null,
        medicationName: r.medicationName ?? r.name ?? a.medicationName ?? '',
        nome: r.medicationName ?? r.name ?? a.medicationName ?? '',
        dose: r.dose ?? '',
        via: r.route ?? r.via ?? a.route ?? 'IV',
        hora: this.formatTimeForApp(r.time ?? r.hora)
      })) : []
    })) : [];

    const procedures = [];

    if (Array.isArray(api.surgeries)) {
      for (const surgery of api.surgeries) {
        if (Array.isArray(surgery.procedures)) {
          for (const proc of surgery.procedures) {
            procedures.push({
              procedimentoId: proc.id?.toString() ?? '',
              hora: this.formatTimeForApp(proc.time ?? proc.hora),
              principal: !!proc.isPrimary
            });
          }
        }
      }
    }

    if (procedures.length === 0 && api.surgery) {
      if (Array.isArray(api.surgery.procedures)) {
        for (const proc of api.surgery.procedures) {
          procedures.push({
            procedimentoId: proc.id?.toString() ?? '',
            hora: this.formatTimeForApp(proc.time ?? proc.hora),
            principal: !!proc.isPrimary
          });
        }
      }
    }

    if (procedures.length === 0 && Array.isArray(api.patient?.surgeries)) {
      for (const surgery of api.patient.surgeries) {
        if (Array.isArray(surgery.procedures)) {
          for (const proc of surgery.procedures) {
            procedures.push({
              procedimentoId: proc.id?.toString() ?? '',
              hora: this.formatTimeForApp(proc.time ?? proc.hora),
              principal: !!proc.isPrimary
            });
          }
        }
      }
    }

    const posicoes = [];
    if (api.surgicalPosition && this.POSITION_MAP[api.surgicalPosition]) {
      posicoes.push(this.POSITION_MAP[api.surgicalPosition]);
    }

    const acessoVenoso = [];
    if (api.venousAccessType && this.VENOUS_ACCESS_MAP[api.venousAccessType]) {
      acessoVenoso.push(this.VENOUS_ACCESS_MAP[api.venousAccessType]);
    }

    const condicoesClinicasAlta = [];
    if (api.clinicalDischargeCondition && this.CLINICAL_CONDITION_MAP[api.clinicalDischargeCondition]) {
      condicoesClinicasAlta.push(this.CLINICAL_CONDITION_MAP[api.clinicalDischargeCondition]);
    }

    const respiracaoAssistida = [];
    const respiracaoControlada = [];
    if (api.respirationMode === 1) respiracaoAssistida.push('Assistida');
    else if (api.respirationMode === 2) respiracaoControlada.push('Controlada');

    const vaGuedel = api.airwayDeviceType === 1;
    const vaMascLaringea = api.airwayDeviceType === 2;
    const vaMascFacial = api.airwayDeviceType === 3;
    const vaTubo = api.airwayDeviceType === 4;

    const tipoSimples = api.airwayType === 1;
    const tipoEndobronquico = api.airwayType === 2;
    const tipoAramado = api.airwayType === 3;
    const tipoOutras = api.airwayType === 4;

    let asaValue = '1';
    if (api.asaClassification) {
      const num = Number(api.asaClassification);
      if (!isNaN(num) && num >= 1 && num <= 6) {
        asaValue = num.toString();
      }
    }

    const consciousnessScore = api.consciousnessScore !== null && api.consciousnessScore !== undefined
      ? Number(api.consciousnessScore)
      : '';
    const activityScore = api.activityScore !== null && api.activityScore !== undefined
      ? Number(api.activityScore)
      : '';
    const circulationScore = api.circulationScore !== null && api.circulationScore !== undefined
      ? Number(api.circulationScore)
      : '';
    const respirationScore = api.respirationScore !== null && api.respirationScore !== undefined
      ? Number(api.respirationScore)
      : '';
    const oxygenSaturationScore = api.oxygenSaturationScore !== null && api.oxygenSaturationScore !== undefined
      ? Number(api.oxygenSaturationScore)
      : '';

    const surgeonId = api.surgeonId !== null && api.surgeonId !== undefined
      ? api.surgeonId.toString()
      : '';
    const assistantId = api.assistantId !== null && api.assistantId !== undefined
      ? api.assistantId.toString()
      : '';

    const secondAnesthesiologistId = api.secondAnesthesiologistId !== null && api.secondAnesthesiologistId !== undefined
      ? api.secondAnesthesiologistId.toString()
      : '';

    return {
      id: api.id,
      pacienteId: api.id?.toString(),
      seguranca: {
        identificadoAvaliado: api.patientIdentifiedBeforeInduction ? 'sim' : 'nao',
        consentimentoAssinado: api.anestheticConsentSigned ? 'sim' : 'nao',
        equipamentosChecados: api.anesthesiaEquipmentChecked ? 'sim' : 'nao',
        atencao: api.safetyObservations || ''
      },

      preInducao: {
        recebeuMedPrevia: api.preAnestheticMedication ? 'sim' : 'nao',
        farmacoId: api.preAnestheticMedicationId?.toString() ?? null,
        farmaco: api.preAnestheticMedicationName ?? '',
        dose: api.preAnestheticMedicationDose ?? '',
        via: api.preAnestheticMedicationRoute ?? '',
        outrasVia: api.preAnestheticMedicationOtherRoute ?? '',
        hora: this.formatTimeForApp(api.preAnestheticMedicationTime)
      },

      antibiotico: {
        temAntibiotico: api.prophylacticAntibioticUsed ? 'sim' : 'nao'
      },

      antibioticsList,

      dadosVitais: {
        pa: api.bloodPressure || '',
        fr: api.respiratoryRate?.toString() || '',
        temp: api.temperature?.toString() || '',
        spo2: api.oxygenSaturation?.toString() || '',
        peso: api.weightKg?.toString() || '',
        asa: asaValue,
        entradaSala: this.formatTimeForApp(api.roomEntryTime)
      },

      equipe: {
        cirurgiao: surgeonId,
        cirurgiaoId: api.surgeonId ?? null,
        assistente: assistantId,
        assistenteId: api.assistantId ?? null,
        diagnosticoPre: api.preOperativeDiagnosis || '',
        horaInicioAnestesia: this.formatTimeForApp(api.anesthesiaStartTime)
      },

      posicao: {
        posicoes: posicoes,
        outrasPosicao: '',
        usoCoxim: api.usesCushions ? 'sim' : 'nao',
        localCoxim: api.cushionsAccessLocation || '',
        acessoVenoso: acessoVenoso,
        outroAcesso: '',
        localAcesso: api.venousAccessLocation || '',
        dificuldadePuncao: api.difficultVenousPuncture ? 'sim' : 'nao'
      },

      tecnica: {
        anestesiaGeral: api.generalAnesthesia ? 'sim' : 'nao',
        respiracaoAssistida: respiracaoAssistida,
        respiracaoControlada: respiracaoControlada,
        circuitoAbsorvedor: api.co2AbsorberCircuit ? 'sim' : 'nao',
        vaGuedel: vaGuedel,
        vaMascLaringea: vaMascLaringea,
        vaMascFacial: vaMascFacial,
        vaTubo: vaTubo,
        guedelNo: '',
        mascLaringeaNo: '',
        mascFacialNo: '',
        tuboNo: api.airwayDeviceNumber || '',
        cuff: false,
        iot: false,
        oral: api.oralTube || false,
        nasal: api.nasalTube || false,
        facil: api.intubationDifficulty === 1,
        dificil: api.intubationDifficulty === 2,
        tipoSimples: tipoSimples,
        tipoOutras: tipoOutras,
        tipoOutrasTexto: api.otherAirwayTypeDescription || '',
        tipoEndobronquico: tipoEndobronquico,
        tipoAramado: tipoAramado,
        tecLaringoscopia: api.laryngoscopy || false,
        tecBroncofibroscopia: api.bronchofibroscopy || false,
        tecRetrograda: api.retrogradeTechnique || false,
        tecTraqueostomia: api.tracheostomy || false,
        tecVideolaringoscopia: api.videoLaryngoscopy || false,
        tecVAOutras: false,
        tecVAOutrasTexto: api.otherAirwayTechnique || '',
        bloqueiosEspinhais: api.spinalBlockPerformed ? 'sim' : 'nao',
        nivelPuncao: [],
        posicaoPuncao: '',
        cateter: '',
        opioide: '',
        numeroPuncoes: '',
        sedacao: api.sedationPerformed ? 'sim' : 'nao',
        suplementacaoO2: api.oxygenSupplementation ? 'sim' : 'nao',
        tipoSuplementacaoO2: [],
        suplementacaoO2TemOutros: false,
        suplementacaoO2Outros: '',
        bloqueioPlexo: api.plexusBlockPerformed ? 'sim' : 'nao',
        neuroestimulador: '',
        nervosEstimulados: [],
        nervosEstimuladosOutros: ''
      },

      posProcedimento: {
        procedimentos: procedures,
        horaTerminoCirurgia: this.formatTimeForApp(api.surgeryEndTime),
        diagnosticoPos: api.postOperativeDiagnosis || '',
        horaTerminoAnestesia: this.formatTimeForApp(api.anesthesiaEndTime)
      },

      alderete: {
        consciencia: consciousnessScore,
        atividade: activityScore,
        circulacao: circulationScore,
        respiracao: respirationScore,
        saturacao: oxygenSaturationScore,
        horaAvaliacao: '',
        condicoesClinicasAlta: condicoesClinicasAlta,
        condicoesAltaOutras: '',
        dor: api.hasPain ? 'sim' : 'nao',
        dorUsouENV: this.parseBoolean(api.dorUsouENV),
        dorENV: api.dorENV?.toString() ?? '',
        dorUsouPAINAD: this.parseBoolean(api.dorUsouPAINAD),
        dorPAINAD: api.dorPAINAD?.toString() ?? '',
        dorUsouBPS: this.parseBoolean(api.dorUsouBPS),
        dorBPS: api.dorBPS?.toString() ?? '',
        conduta: api.conduta || ''
      },

      assinaturas: {
        primeiroAnestesista: api.firstAnesthesiologistName ?? '',
        primeiroAnestesistaId: api.firstAnesthesiologistId?.toString() ?? null,
        segundoAnestesista: secondAnesthesiologistId,
        segundoAnestesistaId: api.secondAnesthesiologistId ?? null,
        dataAssinatura: new Date().toISOString().split('T')[0]
      },

      surgeryId: api.surgeryId,
      externalPatientId: api.externalPatientId,
      recordDate: api.recordDate,
      surgeryDate: api.surgeryDate,
      createdAt: api.createdAt,
      lastUpdate: api.lastUpdate,
      status: api.status
    };
  }
}