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

  constructor(api: ApiService) {
    super(api, 'anesthesiarecord');
    this.updatePendingStatus();
  }

  saveRecord(record: any): Observable<any> {
    console.log('Serviço: Salvando ficha via API...', record);
    const surgeryId = Number(record.cirurgiaId ?? record.surgeryId ?? record.id);
    const apiPayload = this.mapToApiFormat(record, surgeryId);
    return this.update(surgeryId, apiPayload).pipe(
      map(response => ({ response, surgeryId }))
    );
  }

  syncPendingDrafts(): void {
    if (this.syncing) return;
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
        if (!navigator.onLine) return;
        if (!this.serverOnline) return;
        if (this.getPendingDraftsCount() === 0) return;
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
        error: () => {
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

  refreshPendingDrafts(): void { this.updatePendingStatus(); }
  startSync(): void { this.syncingSubject.next(true); }
  finishSync(): void { this.syncingSubject.next(false); }

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

  private pick<T>(...values: T[]): T | undefined {
    for (const v of values) {
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  }

  private mapToApiFormat(app: any, surgeryId: number): any {
    const todayDate = new Date().toISOString().split('T')[0];
    const parsedAsa = app.dadosVitais?.asa ? parseInt(app.dadosVitais.asa.replace('ASA ', '')) : 1;

    const surgeries = Array.isArray(app.cirurgias)
      ? app.cirurgias
      : Array.isArray(app.posProcedimento?.procedimentos)
        ? app.posProcedimento.procedimentos.map((p: any) => ({
          id: p.id ?? p.procedimentoId ?? null,
          description: p.description ?? p.descricao ?? '',
          cid: p.cid ?? null,
          hora: p.hora ?? '',
          isPrimary: !!(p.isPrimary ?? p.principal)
        }))
        : [];

    const principal = surgeries.find((c: any) => c.isPrimary) || surgeries[0];

    const firstAnesthesiologistId = this.pick(
      app.firstAnesthesiologistId,
      app.assinaturas?.primeiroAnestesistaId, 0);
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

    return {
      id: surgeryId,
      surgeryId: surgeryId,
      patientId: app.patientId || 1,
      recordDate: app.recordDate || todayDate,

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
      respiratoryRate: Number(app.dadosVitais?.fr) || 0,
      temperature: Number(app.dadosVitais?.temp) || 0,
      oxygenSaturation: Number(app.dadosVitais?.spo2) || 0,
      weightKg: Number(app.dadosVitais?.peso) || 0,
      asaClassification: isNaN(parsedAsa) ? 1 : parsedAsa,
      roomEntryTime: this.formatTimeForApi(app.dadosVitais?.entradaSala),
      anesthesiaStartTime: this.formatTimeForApi(app.equipe?.horaInicioAnestesia),
      surgeryEndTime: this.formatTimeForApi(app.posProcedimento?.horaTerminoCirurgia),
      anesthesiaEndTime: this.formatTimeForApi(app.posProcedimento?.horaTerminoAnestesia),
      surgeon: this.pick(app.surgeon, app.equipe?.cirurgiao, '') || '',
      surgeonId: this.pick(app.surgeonId, app.equipe?.cirurgiaoId, null),
      assistant: this.pick(app.assistant, app.equipe?.assistente, '') || '',
      assistantId: this.pick(app.assistantId, app.equipe?.assistenteId, null),
      preOperativeDiagnosis: app.equipe?.diagnosticoPre || '',
      surgicalPosition: 1,
      usesCushions: app.posicao?.usoCoxim === 'sim',
      venousAccessType: 1,
      venousAccessLocation: app.posicao?.localAcesso || '',
      difficultVenousPuncture: app.posicao?.dificuldadePuncao === 'sim',
      generalAnesthesia: app.tecnica?.anestesiaGeral === 'sim',
      respirationMode: 1,
      controlledVentilationMode: 1,
      co2AbsorberCircuit: app.tecnica?.circuitoAbsorvedor === 'sim',
      airwayDeviceType: 1,
      airwayDeviceNumber: "7.5",
      oralTube: app.tecnica?.oral || false,
      nasalTube: app.tecnica?.nasal || false,
      intubationDifficulty: app.tecnica?.dificil ? 2 : 1,
      airwayType: 1,
      otherAirwayTypeDescription: null,
      laryngoscopy: app.tecnica?.tecLaringoscopia || false,
      retrogradeTechnique: app.tecnica?.tecRetrograda || false,
      videoLaryngoscopy: app.tecnica?.tecVideolaringoscopia || false,
      bronchofibroscopy: app.tecnica?.tecBroncofibroscopia || false,
      tracheostomy: app.tecnica?.tecTraqueostomia || false,
      otherAirwayTechnique: null,
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
      postOperativeDiagnosis: app.posProcedimento?.diagnosticoPos || '',
      consciousnessScore: Number(app.alderete?.consciencia) || 0,
      activityScore: Number(app.alderete?.atividade) || 0,
      circulationScore: Number(app.alderete?.circulacao) || 0,
      respirationScore: Number(app.alderete?.respiracao) || 0,
      oxygenSaturationScore: Number(app.alderete?.saturacao) || 0,
      totalAldreteKroulikScore: 10,
      clinicalDischargeCondition: 1,
      destination: 1,
      hasPain: app.alderete?.dor === 'sim',
      firstAnesthesiologistId: firstAnesthesiologistId ?? 0,
      firstAnesthesiologistName: firstAnesthesiologistName ?? '',
      secondAnesthesiologistId: secondAnesthesiologistId ?? null,
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
      hora: a.time ?? a.hora ?? '',
      temRepique: a.hasBooster ? 'sim' : 'nao',
      repiques: Array.isArray(a.boosters) ? a.boosters.map((r: any) => ({
        medicationId: r.medicationId ?? a.medicationId ?? null,
        medicationName: r.medicationName ?? r.name ?? a.medicationName ?? '',
        nome: r.medicationName ?? r.name ?? a.medicationName ?? '',
        dose: r.dose ?? '',
        via: r.route ?? r.via ?? a.route ?? 'IV',
        hora: r.time ?? r.hora ?? ''
      })) : []
    })) : [];

    return {
      id: api.id,
      pacienteId: api.id?.toString(),
      seguranca: {
        identificadoAvaliado: api.patientIdentifiedBeforeInduction ? 'sim' : 'nao',
        consentimentoAssinado: api.anestheticConsentSigned ? 'sim' : 'nao',
        equipamentosChecados: api.anesthesiaEquipmentChecked ? 'sim' : 'nao',
        atencao: api.safetyObservations
      },
      preInducao: {
        recebeuMedPrevia: api.preAnestheticMedication ? 'sim' : 'nao',
        farmacoId: api.preAnestheticMedicationId ?? null,
        farmaco: api.preAnestheticMedicationName ?? '',
        dose: api.preAnestheticMedicationDose ?? '',
        via: api.preAnestheticMedicationRoute ?? '',
        outrasVia: api.preAnestheticMedicationOtherRoute ?? '',
        hora: api.preAnestheticMedicationTime ?? ''
      },
      antibiotico: {
        temAntibiotico: api.prophylacticAntibioticUsed ? 'sim' : 'nao'
      },
      antibioticsList,
      dadosVitais: {
        pa: api.bloodPressure,
        fr: api.respiratoryRate?.toString(),
        temp: api.temperature?.toString(),
        spo2: api.oxygenSaturation?.toString(),
        peso: api.weightKg?.toString(),
        asa: 'ASA ' + (api.asaClassification || 'I'),
        entradaSala: api.roomEntryTime
      },
      equipe: {
        cirurgiao: api.surgeon,
        cirurgiaoId: api.surgeonId ?? null,
        assistente: api.assistant,
        assistenteId: api.assistantId ?? null,
        diagnosticoPre: api.preOperativeDiagnosis,
        horaInicioAnestesia: api.anesthesiaStartTime
      },
      posicao: {
        usoCoxim: api.usesCushions ? 'sim' : 'nao',
        localAcesso: api.venousAccessLocation,
        dificuldadePuncao: api.difficultVenousPuncture ? 'sim' : 'nao'
      },
      tecnica: {
        anestesiaGeral: api.generalAnesthesia ? 'sim' : 'nao',
        circuitoAbsorvedor: api.co2AbsorberCircuit ? 'sim' : 'nao',
        oral: api.oralTube,
        nasal: api.nasalTube,
        dificil: api.intubationDifficulty > 1,
        tecLaringoscopia: api.laryngoscopy,
        tecRetrograda: api.retrogradeTechnique,
        tecVideolaringoscopia: api.videoLaryngoscopy,
        tecBroncofibroscopia: api.bronchofibroscopy,
        tecTraqueostomia: api.tracheostomy,
        bloqueiosEspinhais: api.spinalBlockPerformed ? 'sim' : 'nao',
        sedacao: api.sedationPerformed ? 'sim' : 'nao',
        suplementacaoO2: api.oxygenSupplementation ? 'sim' : 'nao',
        bloqueioPlexo: api.plexusBlockPerformed ? 'sim' : 'nao'
      },
      posProcedimento: {
        cirurgiaRealizada: api.surgeryPerformed,
        procedimentos: Array.isArray(api.cirurgias ?? api.surgeries)
          ? (api.cirurgias ?? api.surgeries).map((c: any) => ({
            id: c.id ?? null,
            description: c.description ?? '',
            cid: c.cid ?? null,
            hora: c.hora ?? '',
            isPrimary: !!c.isPrimary
          }))
          : [],
        horaTerminoCirurgia: api.surgeryEndTime,
        diagnosticoPos: api.postOperativeDiagnosis,
        horaTerminoAnestesia: api.anesthesiaEndTime
      },
      alderete: {
        consciencia: api.consciousnessScore?.toString(),
        atividade: api.activityScore?.toString(),
        circulacao: api.circulationScore?.toString(),
        respiracao: api.respirationScore?.toString(),
        saturacao: api.oxygenSaturationScore?.toString(),
        dor: api.hasPain ? 'sim' : 'nao'
      },
      assinaturas: {
        primeiroAnestesista: api.firstAnesthesiologistName ?? '',
        primeiroAnestesistaId: api.firstAnesthesiologistId ?? null,
        segundoAnestesista: api.secondAnesthesiologistName ?? '',
        segundoAnestesistaId: api.secondAnesthesiologistId ?? null
      }
    };
  }
}
