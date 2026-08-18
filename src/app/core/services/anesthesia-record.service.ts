import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { ApiService } from "./base/api.service";
import { BaseService } from "./base/base.service";
import { AnesthesiaRecordModel } from "../../shared/models/anesthesia-record.model";
import { from, interval, Observable, of, Subscription, throwError } from "rxjs";
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

  private readonly NERVES_FRONTEND_TO_BACKEND: Record<string, number> = {
    'Plexo Braquial': 1,
    'PlexoLombar': 2,
    'PlexoSacral': 3,
    'Femoral': 4,
    'Ciatico': 5,
    'Axilar': 6,
    'Iliohipogastrico': 7,
    'Ilioinguinal': 7,
    'Retrobulbar': 7,
    'Peribulbar': 7,
    'Outros': 7
  };

  private readonly NERVES_BACKEND_TO_FRONTEND: Record<number, string> = {
    1: 'Plexo Braquial',
    2: 'Plexo Lombar',
    3: 'Plexo Sacral',
    4: 'Femoral',
    5: 'Ciatico',
    6: 'Axilar',
    7: 'Outros'
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

  private readonly NERVES_MAP: Record<number, string> = {
    1: 'Plexo Braquial',
    2: 'Plexo Lombar',
    3: 'Plexo Sacral',
    4: 'Nervo Femoral',
    5: 'Nervo Ciático',
    6: 'Nervo Axilar',
    7: 'Outros'
  };

  private readonly NERVES_REVERSE_MAP: Record<string, number> = {
    'Plexo Braquial': 1,
    'Plexo Lombar': 2,
    'Plexo Sacral': 3,
    'Nervo Femoral': 4,
    'Nervo Ciático': 5,
    'Nervo Axilar': 6,
    'Outros': 7
  };

  private readonly PUNCTURE_LEVEL_MAP: Record<number, string> = {
    1: 'L1-L2',
    2: 'L2-L3',
    3: 'L3-L4',
    4: 'L4-L5',
    5: 'L5-S1',
    6: 'Outro'
  };

  private readonly PUNCTURE_LEVEL_REVERSE_MAP: Record<string, number> = {
    'L1-L2': 1,
    'L2-L3': 2,
    'L3-L4': 3,
    'L4-L5': 4,
    'L5-S1': 5,
    'Outro': 6
  };

  private readonly O2_SUPPLEMENTATION_MAP: Record<number, string> = {
    1: 'Cateter Nasal',
    2: 'Máscara Simples',
    3: 'Máscara com Reservatório',
    4: 'Venturi',
    5: 'Outros'
  };

  private readonly O2_SUPPLEMENTATION_REVERSE_MAP: Record<string, number> = {
    'Cateter Nasal': 1,
    'Máscara Simples': 2,
    'Máscara com Reservatório': 3,
    'Venturi': 4,
    'Outros': 5
  };

  constructor(api: ApiService) {
    super(api, 'anesthesiarecord');
    this.updatePendingStatus();
  }

  saveRecord(record: any): Observable<any> {
    const surgeryId = Number(this.pick(record?.cirurgiaId, record?.surgeryId, record?.id));

    if (!Number.isFinite(surgeryId) || surgeryId <= 0) {
      return throwError(() => new Error('Não foi possível sincronizar: cirurgiaId/surgeryId inválido.'));
    }

    const apiPayload = this.mapToApiFormat(record, surgeryId);

    if (record.isMonitoringDraft) {
      return this.api.put(`monitoringrecord/${surgeryId}`, apiPayload).pipe(
        map(response => ({ response, surgeryId }))
      );
    }

    return this.update(surgeryId, apiPayload).pipe(
      map(response => ({ response, surgeryId }))
    );
  }

  syncPendingDrafts(): void {
    if (this.syncing)
      return;

    this.syncing = true;
    this.startSync();

    const drafts = this.getPendingDrafts().filter(draft => this.canSyncDraft(draft));

    if (drafts.length === 0) {
      this.syncing = false;
      this.finishSync();
      return;
    }

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
        if (!result)
          return;

        this.clearDraft(result.surgeryId.toString());
      });
  }

  private getPendingDrafts(): any[] {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.DRAFT_PREFIX) || key.startsWith('monitoring_draft_'))
      .map(key => this.safeJsonParse(localStorage.getItem(key)))
      .filter((draft): draft is any => !!draft);
  }

  private safeJsonParse(value: string | null): any | null {
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Rascunho de anestesia inválido no storage:', error);
      return null;
    }
  }

  private canSyncDraft(draft: any): boolean {
    if (!draft) return false;

    const surgeryId = Number(this.pick(draft.cirurgiaId, draft.surgeryId, draft.id));
    if (!Number.isFinite(surgeryId) || surgeryId <= 0) return false;


    if (draft.isMonitoringDraft && !draft.readyForApiSync && !draft.finalized) {
      return false;
    }

    return true;
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

  public updatePendingStatus(): void {
    const count = Object.keys(localStorage)
      .filter(key =>
        key.startsWith(this.DRAFT_PREFIX) ||        
        key.startsWith('draft_monitoring_') ||     
        key.startsWith('monitoring_draft_')        
      ).length;
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
      .filter(key => key.startsWith(this.DRAFT_PREFIX) || key.startsWith('monitoring_draft_')).length;
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

  private normalizeIso(value: any): string | null {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toISOString();
  }

  private mapVitalRecords(records: any[]): any[] {
    if (!Array.isArray(records)) return [];

    return records.map(record => {
      const customFields = Object.keys(record.custom ?? {}).map(key => ({
        name: key,
        value: String(record.custom[key])
      }));

      const dt = new Date(this.normalizeIso(record.timestamp) ?? new Date().toISOString());
      
      return {
        time: dt.toISOString().split('T')[1].substring(0, 8),
        date: dt.toISOString().split('T')[0] + 'T00:00:00.000Z',
        systolicBloodPressure: this.parseNumber(record.pas),
        diastolicBloodPressure: this.parseNumber(record.pad),
        meanArterialPressure: this.parseNumber(record.pam),
        heartRate: this.parseNumber(record.fc),
        spo2: this.parseNumber(record.spo2),
        etco2: this.parseNumber(record.etco2),
        temperature: this.parseNumber(record.temp ?? record.temperatura),
        bis: this.parseNumber(record.bis),
        pvc: this.parseNumber(record.pvc),
        pcap: this.parseNumber(record.pcap),
        customFields: customFields
      };
    });
  }

  private mapMonitoringAgents(records: any[]): any[] {
    if (!Array.isArray(records)) return [];

    const mapRoute = (r: string) => {
      switch ((r || '').toUpperCase()) {
        case 'IV': return 1;
        case 'IM': return 2;
        case 'SC': return 3;
        case 'VO': return 4;
        default: return 1;
      }
    };

    return records.map(record => {
      const dt = new Date(this.normalizeIso(record.timestamp) ?? new Date().toISOString());
      return {
        time: dt.toISOString().split('T')[1].substring(0, 8),
        date: dt.toISOString().split('T')[0] + 'T00:00:00.000Z',
        dose: this.parseNumber(record.dose),
        unit: 1, // Fixado como 1 temporariamente até ter o enum real de MedicationUnitEnum
        route: mapRoute(record.route ?? record.via),
        drugId: record.medicationId ?? record.id ?? 0
      };
    });
  }

  private mapMonitoringEvents(records: any[]): any[] {
    if (!Array.isArray(records)) return [];

    const mapEventType = (t: string) => {
      switch (t) {
        case 'position': return 1;
        case 'airway': return 2;
        case 'surgical': return 3;
        case 'clinical': return 4;
        case 'medication': return 5;
        case 'anesthesia': return 6;
        default: return 7;
      }
    };

    return records.map(record => {
      const dt = new Date(this.normalizeIso(record.timestamp) ?? new Date().toISOString());
      return {
        time: dt.toISOString().split('T')[1].substring(0, 8),
        date: dt.toISOString().split('T')[0] + 'T00:00:00.000Z',
        eventType: mapEventType(record.type ?? record.tipo),
        observations: record.observation ?? record.observacao ?? ''
      };
    });
  }

  private mapFluidBalance(records: any[]): any[] {
    if (!Array.isArray(records)) return [];

    const idToCategoryMap: Record<string, number> = {
      'crystalloid': 1,
      'colloid': 2,
      'blood': 3,
      'urine': 4,
      'bleeding': 5,
      'drain': 6,
      'aspirate': 7,
      'other_gain': 8,
      'other_loss': 8,
      'insensible': 8 // mapped to other if no better match
    };

    return records.map(record => {
      const dt = new Date(this.normalizeIso(record.timestamp) ?? new Date().toISOString());
      
      let catNum = 1; // default Cristaloide
      if (typeof record.itemId === 'number') {
        catNum = record.itemId;
      } else if (typeof record.itemId === 'string' && idToCategoryMap[record.itemId]) {
        catNum = idToCategoryMap[record.itemId];
      }

      return {
        time: dt.toISOString().split('T')[1].substring(0, 8),
        date: dt.toISOString().split('T')[0] + 'T00:00:00.000Z',
        category: catNum,
        categoryId: catNum, // mandando ambos por garantia
        details: record.detail ?? record.item ?? record.description ?? '',
        volumeMl: this.parseNumber(record.volumeMl ?? record.volume),
        type: (record.type ?? record.tipo) === 'loss' ? 2 : 1 // 1: Gain, 2: Loss
      };
    });
  }

  private mapPositions(records: any[]): any[] {
    if (!Array.isArray(records)) return [];

    return records.map(record => {
      const dt = new Date(this.normalizeIso(record.timestamp) ?? new Date().toISOString());
      return {
        time: dt.toISOString().split('T')[1].substring(0, 8),
        date: dt.toISOString().split('T')[0] + 'T00:00:00.000Z',
        position: this.POSITION_REVERSE_MAP[record.position ?? record.posicao] || 1
      };
    });
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
    const preAnestheticMedicationId = this.pick(preMed.medication?.id, preMed.farmacoId, null) ?? null;
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

    let respirationMode = 0;
    let controlledVentilationMode: number | null = null;

    if (respControlada.includes('Volume')) {
      respirationMode = 3;
      controlledVentilationMode = 1;
    } else if (respControlada.includes('Pressao')) {
      respirationMode = 4;
      controlledVentilationMode = 2;
    } else if (respAssistida.includes('Espontanea')) {
      respirationMode = 1;
    } else if (respAssistida.includes('Manual')) {
      respirationMode = 2;
    }

    let airwayType: number | null = null;
    if (app.tecnica?.tipoSimples) airwayType = 1;
    else if (app.tecnica?.tipoEndobronquico) airwayType = 2;
    else if (app.tecnica?.tipoAramado) airwayType = 3;
    else if (app.tecnica?.tipoOutras) airwayType = 4;

    const airwayDevices: number[] = [];
    if (app.tecnica?.vaGuedel) airwayDevices.push(1);
    if (app.tecnica?.vaMascLaringea) airwayDevices.push(2);
    if (app.tecnica?.vaMascFacial) airwayDevices.push(3);
    if (app.tecnica?.vaTubo) airwayDevices.push(4);

    const deviceNumbers = {
      guedel: app.tecnica?.guedelNo || '',
      mascLaringea: app.tecnica?.mascLaringeaNo || '',
      mascFacial: app.tecnica?.mascFacialNo || '',
      tubo: app.tecnica?.tuboNo || ''
    };

    const punctureLevels: number[] = [];
    if (Array.isArray(app.tecnica?.nivelPuncao)) {
      for (const levelStr of app.tecnica.nivelPuncao) {
        const mapped = this.PUNCTURE_LEVEL_REVERSE_MAP[levelStr];
        if (mapped !== undefined) {
          punctureLevels.push(mapped);
        }
      }
    }

    const posicaoPuncaoMap: Record<string, number> = {
      'Sentada': 1,
      'Decubito': 2
    };
    const posicaoPuncao = app.tecnica?.posicaoPuncao
      ? posicaoPuncaoMap[app.tecnica.posicaoPuncao] || 1
      : 1;

    const stimulatedNerves: number[] = [];
    if (Array.isArray(app.tecnica?.nervosEstimulados)) {
      for (const nerveStr of app.tecnica.nervosEstimulados) {
        let mapped = this.NERVES_FRONTEND_TO_BACKEND[nerveStr];
        if (mapped === undefined) {
          mapped = this.NERVES_REVERSE_MAP[nerveStr];
        }
        if (mapped !== undefined) {
          stimulatedNerves.push(mapped);
        }
      }
    }

    const o2SupplementationTypes = Array.isArray(app.tecnica?.tipoSuplementacaoO2)
      ? app.tecnica.tipoSuplementacaoO2
        .map((type: string) => this.O2_SUPPLEMENTATION_REVERSE_MAP[type])
        .filter((id: number | undefined) => id !== undefined)
      : [];

    const condicoesAltaArray = Array.isArray(app.alderete?.condicoesClinicasAlta) ? app.alderete.condicoesClinicasAlta : [];
    let clinicalDischargeCondition = 1;
    let dischargeConditionOther = '';
    if (condicoesAltaArray.length > 0) {
      if (condicoesAltaArray[0] === 'Outras') {
        clinicalDischargeCondition = 4;
        dischargeConditionOther = app.alderete?.condicoesAltaOutras || '';
      } else {
        clinicalDischargeCondition = this.CLINICAL_CONDITION_REVERSE_MAP[condicoesAltaArray[0]] || 1;
      }
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

    const monitoringVitalRecords = this.mapVitalRecords(app.vitalRecords);
    const monitoringAgents = this.mapMonitoringAgents(app.agents);
    const monitoringEvents = this.mapMonitoringEvents(app.events ?? app.clinicalEvents);
    const monitoringFluidBalance = this.mapFluidBalance(app.fluidBalance);
    const monitoringPositions = this.mapPositions(app.positions ?? app.positionHistory);

    return {
      command: app.command ?? 'UpdateAnesthesiaRecord',
      id: surgeryId,
      anesthesiaRecordId: surgeryId,
      surgeryId: surgeryId,
      patientId: app.patientId || null,
      recordDate: app.recordDate || todayDate,
      surgeryDate: app.surgeryDate || todayDate,
      
      // Datas e profissionais necessários para MonitoringRecord
      recordedByProfessionalId: firstAnesthesiologistId ?? 0,
      startedAt: this.normalizeIso(app.equipe?.horaInicioAnestesia) ?? new Date().toISOString(),
      endedAt: this.normalizeIso(app.posProcedimento?.horaTerminoAnestesia) ?? null,
      surgeryStartedAt: this.normalizeIso(principal?.time) ?? new Date().toISOString(),
      surgeryEndedAt: this.normalizeIso(app.posProcedimento?.horaTerminoCirurgia) ?? null,

      surgeries: surgeries,

      // Segurança
      patientIdentifiedBeforeInduction: app.seguranca?.identificadoAvaliado === 'sim',
      anestheticConsentSigned: app.seguranca?.consentimentoAssinado === 'sim',
      anesthesiaEquipmentChecked: app.seguranca?.equipamentosChecados === 'sim',
      safetyObservations: app.seguranca?.atencao || '',

      // Pré-Indução
      preAnestheticMedication: app.preInducao?.recebeuMedPrevia === 'sim',
      preAnestheticMedicationId,
      preAnestheticMedicationName,
      preAnestheticMedicationDose,
      preAnestheticMedicationRoute,
      preAnestheticMedicationOtherRoute,
      preAnestheticMedicationTime,

      // Antibiótico
      prophylacticAntibioticUsed: app.antibiotico?.temAntibiotico === 'sim',
      antibioticsList,

      // Dados Vitais
      bloodPressure: app.dadosVitais?.pa || '',
      respiratoryRate: this.parseNumber(app.dadosVitais?.fr),
      temperature: this.parseNumber(app.dadosVitais?.temp),
      oxygenSaturation: this.parseNumber(app.dadosVitais?.spo2),
      weightKg: this.parseNumber(app.dadosVitais?.peso),
      asaClassification: parsedAsa,
      roomEntryTime: this.formatTimeForApi(app.dadosVitais?.entradaSala),

      // Equipe
      anesthesiaStartTime: this.formatTimeForApi(app.equipe?.horaInicioAnestesia),
      surgeonId: surgeonId,
      assistantId: assistantId,
      preOperativeDiagnosis: app.equipe?.diagnosticoPre || '',

      // Posição
      surgicalPosition: surgicalPosition,
      usesCushions: app.posicao?.usoCoxim === 'sim',
      cushionsAccessLocation: app.posicao?.localCoxim || '',
      otherSurgicalPosition: app.posicao?.outrasPosicao || '',
      venousAccessType: venousAccessType,
      otherVenousAccess: app.posicao?.outroAcesso || '',
      venousAccessLocation: app.posicao?.localAcesso || '',
      difficultVenousPuncture: app.posicao?.dificuldadePuncao === 'sim',

      // Técnica Anestésica - Geral
      generalAnesthesia: app.tecnica?.anestesiaGeral === 'sim',
      respirationMode: respirationMode,
      controlledVentilationMode: controlledVentilationMode,
      co2AbsorberCircuit: app.tecnica?.circuitoAbsorvedor === 'sim',

      // Via Aérea - Dispositivos (strings, ex. "Guedel", "Tubo")
      airwayDevices: airwayDevices,
      airwayDeviceType: airwayDevices, // compat legado
      airwayDeviceTypeEnum: airwayDevices.length > 0 ? airwayDevices[0] : null,
      airwayDeviceNumbers: JSON.stringify(deviceNumbers),
      airwayDeviceNumber: app.tecnica?.tuboNo || "7.5",
      cuff: app.tecnica?.cuff || false,
      iot: app.tecnica?.iot || false,
      oralTube: app.tecnica?.oral || false,
      nasalTube: app.tecnica?.nasal || false,
      intubationDifficulty: app.tecnica?.dificil ? 2 : (app.tecnica?.facil ? 1 : 1),

      // Via Aérea - Tipo
      airwayType: airwayType,
      otherAirwayTypeDescription: app.tecnica?.tipoOutrasTexto || null,

      // Via Aérea - Técnicas
      laryngoscopy: app.tecnica?.tecLaringoscopia || false,
      retrogradeTechnique: app.tecnica?.tecRetrograda || false,
      videoLaryngoscopy: app.tecnica?.tecVideolaringoscopia || false,
      bronchofibroscopy: app.tecnica?.tecBroncofibroscopia || false,
      tracheostomy: app.tecnica?.tecTraqueostomia || false,
      otherAirwayTechnique: app.tecnica?.tecVAOutrasTexto || null,
      hasOtherAirwayTechnique: app.tecnica?.tecVAOutras || false,

      // Bloqueios Espinhais
      spinalBlockPerformed: app.tecnica?.bloqueiosEspinhais === 'sim',
      punctureLevels: punctureLevels,
      puncturePosition: posicaoPuncao,
      spinalCatheter: app.tecnica?.cateter === 'sim',
      spinalOpioid: app.tecnica?.opioide === 'sim',
      punctureCount: this.parseNumber(app.tecnica?.numeroPuncoes),

      // Sedação e Oxigênio
      sedationPerformed: app.tecnica?.sedacao === 'sim',
      oxygenSupplementation: app.tecnica?.suplementacaoO2 === 'sim',
      oxygenSupplementationTypes: o2SupplementationTypes,
      oxygenSupplementationOther: app.tecnica?.suplementacaoO2Outros || '',
      hasOxygenSupplementationOther: app.tecnica?.suplementacaoO2TemOutros || false,

      // Bloqueio Plexo
      plexusBlockPerformed: app.tecnica?.bloqueioPlexo === 'sim',
      neurostimulatorUsed: app.tecnica?.neuroestimulador === 'sim',
      stimulatedNerves: stimulatedNerves,

      // Pós-Procedimento
      surgeryPerformed: this.pick(
        app.surgeryPerformed,
        principal?.description,
        app.posProcedimento?.cirurgiaRealizada,
        ''
      ) || '',
      surgeryEndTime: this.formatTimeForApi(app.posProcedimento?.horaTerminoCirurgia),
      postOperativeDiagnosis: app.posProcedimento?.diagnosticoPos || '',
      anesthesiaEndTime: this.formatTimeForApi(app.posProcedimento?.horaTerminoAnestesia),

      // Alderete
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
      aldreteEvaluationTime: this.formatTimeForApi(app.alderete?.horaAvaliacao),
      clinicalDischargeCondition: clinicalDischargeCondition,
      dischargeConditionOther: dischargeConditionOther,
      destination: 1,

      // Dor
      hasPain: app.alderete?.dor === 'sim',
      dorUsouENV: this.parseBoolean(app.alderete?.dorUsouENV),
      dorENV: this.parseNumber(app.alderete?.dorENV),
      dorUsouPAINAD: this.parseBoolean(app.alderete?.dorUsouPAINAD),
      dorPAINAD: this.parseNumber(app.alderete?.dorPAINAD),
      dorUsouBPS: this.parseBoolean(app.alderete?.dorUsouBPS),
      dorBPS: this.parseNumber(app.alderete?.dorBPS),
      conduta: app.alderete?.conduta || '',

      // Assinaturas
      firstAnesthesiologistId: firstAnesthesiologistId ?? 0,
      firstAnesthesiologistName: firstAnesthesiologistName ?? '',
      secondAnesthesiologistId: secondAnesthesiologistIdValue,
      secondAnesthesiologistName: secondAnesthesiologistName ?? null,
      signatureDate: app.assinaturas?.dataAssinatura || todayDate,

      // Monitorização intraoperatória
      vitalSigns: monitoringVitalRecords,
      administeredAgents: monitoringAgents,
      clinicalEvents: monitoringEvents,
      fluidBalances: monitoringFluidBalance,
      positions: monitoringPositions,
      currentPosition: app.posicaoAtual ?? monitoringPositions[monitoringPositions.length - 1]?.position ?? null
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

    if (procedures.length > 0 && !procedures.some(p => p.principal)) {
      procedures[0].principal = true;
    }

    const posicoes = [];
    if (api.surgicalPosition && this.POSITION_MAP[api.surgicalPosition]) {
      posicoes.push(this.POSITION_MAP[api.surgicalPosition]);
    }
    if (api.otherSurgicalPosition) {
      posicoes.push('Outra');
    }

    const acessoVenoso = [];
    if (api.venousAccessType && this.VENOUS_ACCESS_MAP[api.venousAccessType]) {
      acessoVenoso.push(this.VENOUS_ACCESS_MAP[api.venousAccessType]);
    }
    if (api.otherVenousAccess) {
      acessoVenoso.push('Outro');
    }

    const condicoesClinicasAlta = [];
    if (api.clinicalDischargeCondition) {
      if (api.clinicalDischargeCondition === 4) {
        condicoesClinicasAlta.push('Outras');
      } else if (this.CLINICAL_CONDITION_MAP[api.clinicalDischargeCondition]) {
        condicoesClinicasAlta.push(this.CLINICAL_CONDITION_MAP[api.clinicalDischargeCondition]);
      }
    }

    const respiracaoAssistida: string[] = [];
    const respiracaoControlada: string[] = [];
    const rMode = Number(api.respirationMode);
    const cvMode = api.controlledVentilationMode != null ? Number(api.controlledVentilationMode) : null;

    if (rMode === 1) respiracaoAssistida.push('Espontanea');
    else if (rMode === 2) respiracaoAssistida.push('Manual');
    else if (rMode === 3) respiracaoControlada.push('Volume');
    else if (rMode === 4) respiracaoControlada.push('Pressao');
    else if (cvMode === 1) respiracaoControlada.push('Volume');
    else if (cvMode === 2) respiracaoControlada.push('Pressao');

    let airwayDevicesRaw: any[] = [];
    if (Array.isArray(api.airwayDevices) && api.airwayDevices.length > 0) {
      airwayDevicesRaw = api.airwayDevices.map((d: any) => {
        return typeof d === 'object' ? d.deviceType ?? d.id : d;
      });
    } else if (Array.isArray(api.airwayDeviceType) && api.airwayDeviceType.length > 0) {
      airwayDevicesRaw = api.airwayDeviceType;
    } else if (api.airwayDeviceType) {
      airwayDevicesRaw = [api.airwayDeviceType];
    }

    const norm = (v: any) => String(v ?? '').toLowerCase();
    const hasDev = (str: string, num: number) =>
      airwayDevicesRaw.some(x => norm(x) === str || Number(x) === num);

    let vaGuedel = hasDev('guedel', 1);
    let vaMascLaringea = hasDev('mascaralaringea', 2) || airwayDevicesRaw.some(x => norm(x) === 'máscara laríngea');
    let vaMascFacial = hasDev('mascarafacial', 3) || airwayDevicesRaw.some(x => norm(x) === 'máscara facial');
    let vaTubo = hasDev('tubo', 4);

    if (!vaGuedel && !vaMascLaringea && !vaMascFacial && !vaTubo && api.airwayDeviceNumbers) {
      try {
        const numbers = typeof api.airwayDeviceNumbers === 'string'
          ? JSON.parse(api.airwayDeviceNumbers)
          : api.airwayDeviceNumbers;
        if (numbers?.tubo) vaTubo = true;
        if (numbers?.guedel) vaGuedel = true;
        if (numbers?.mascFacial) vaMascFacial = true;
        if (numbers?.mascLaringea) vaMascLaringea = true;
      } catch { /* ignore */ }
    }

    let deviceNumbers = { guedel: '', mascLaringea: '', mascFacial: '', tubo: '' };
    try {
      if (api.airwayDeviceNumbers) {
        deviceNumbers = typeof api.airwayDeviceNumbers === 'string'
          ? JSON.parse(api.airwayDeviceNumbers)
          : api.airwayDeviceNumbers;
      }
    } catch (e) {
      // fallback
    }

    const tipoSimples = api.airwayType === 1;
    const tipoEndobronquico = api.airwayType === 2;
    const tipoAramado = api.airwayType === 3;
    const tipoOutras = api.airwayType === 4;

    const nivelPuncao = Array.isArray(api.punctureLevels)
      ? api.punctureLevels
        .map((item: any) => {
          const id = typeof item === 'object' ? (item.level ?? item.id) : item;
          return this.PUNCTURE_LEVEL_MAP[id];
        })
        .filter((level: string | undefined) => level !== undefined)
      : [];

    const posicaoPuncaoMap: Record<number, string> = {
      1: 'Sentada',
      2: 'Decubito'
    };
    const posicaoPuncao = api.puncturePosition ? posicaoPuncaoMap[api.puncturePosition] || '' : '';

    const nervosEstimulados = Array.isArray(api.stimulatedNerves)
      ? api.stimulatedNerves
        .map((item: any) => {
          const id = typeof item === 'object' ? (item.nerve ?? item.id) : item;
          let nerve = this.NERVES_BACKEND_TO_FRONTEND[id];
          if (nerve === undefined) {
            nerve = this.NERVES_MAP[id];
          }
          return nerve;
        })
        .filter((nerve: string | undefined) => nerve !== undefined)
      : [];

    const tipoSuplementacaoO2 = Array.isArray(api.oxygenSupplementationTypes)
      ? api.oxygenSupplementationTypes
        .map((id: number) => this.O2_SUPPLEMENTATION_MAP[id])
        .filter((type: string | undefined) => type !== undefined)
      : [];

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
        outrasPosicao: api.otherSurgicalPosition || '',
        usoCoxim: api.usesCushions ? 'sim' : 'nao',
        localCoxim: api.cushionsAccessLocation || '',
        acessoVenoso: acessoVenoso,
        outroAcesso: api.otherVenousAccess || '',
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
        guedelNo: deviceNumbers.guedel || '',
        mascLaringeaNo: deviceNumbers.mascLaringea || '',
        mascFacialNo: deviceNumbers.mascFacial || '',
        tuboNo: deviceNumbers.tubo || api.airwayDeviceNumber || '',

        cuff: api.cuff || false,
        iot: api.iot || false,
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
        tecVAOutras: api.hasOtherAirwayTechnique || false,
        tecVAOutrasTexto: api.otherAirwayTechnique || '',

        bloqueiosEspinhais: api.spinalBlockPerformed ? 'sim' : 'nao',
        nivelPuncao: nivelPuncao,
        posicaoPuncao: posicaoPuncao,
        cateter: api.spinalCatheter ? 'sim' : 'nao',
        opioide: api.spinalOpioid ? 'sim' : 'nao',
        numeroPuncoes: api.punctureCount?.toString() || '',

        sedacao: api.sedationPerformed ? 'sim' : 'nao',
        suplementacaoO2: api.oxygenSupplementation ? 'sim' : 'nao',
        tipoSuplementacaoO2: tipoSuplementacaoO2,
        suplementacaoO2TemOutros: api.hasOxygenSupplementationOther || false,
        suplementacaoO2Outros: api.oxygenSupplementationOther || '',

        bloqueioPlexo: api.plexusBlockPerformed ? 'sim' : 'nao',
        neuroestimulador: api.neurostimulatorUsed ? 'sim' : 'nao',
        nervosEstimulados: nervosEstimulados,
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
        horaAvaliacao: this.formatTimeForApp(api.aldreteEvaluationTime),
        condicoesClinicasAlta: condicoesClinicasAlta,
        condicoesAltaOutras: api.dischargeConditionOther || '',
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
        // ✅ CORREÇÃO AQUI
        dataAssinatura: this.formatDateForInput(api.signatureDate)
      },

      surgeryId: api.surgeryId,
      externalPatientId: api.externalPatientId,
      recordDate: api.recordDate,
      surgeryDate: api.surgeryDate,
      createdAt: api.createdAt,
      lastUpdate: api.lastUpdate,
      status: api.status,

      preAnesthesia: api.preAnesthesia ?? api.preAnestheticRecord ?? null,

      isMonitoringDraft: api.isMonitoringDraft ?? false,
      monitoringUpdatedAt: api.monitoringUpdatedAt ?? null,

      vitalRecords: this.mapVitalRecordsToApp(api.vitalSigns ?? []),
      agents: this.mapMonitoringAgentsToApp(api.administeredAgents ?? []),
      events: this.mapMonitoringEventsToApp(api.clinicalEvents ?? []),
      fluidBalance: this.mapFluidBalanceToApp(api.fluidBalances ?? []),
      positions: this.mapPositionsToApp(api.positions ?? []),
      posicaoAtual: api.currentPosition ?? null,

      _raw: api
    };
  }

  private mapVitalRecordsToApp(records: any[]): any[] {
    if (!Array.isArray(records)) return [];
    return records.map(record => {
      const custom: any = {};
      (record.customFields ?? []).forEach((cf: any) => {
        if (cf.name && cf.value) custom[cf.name] = cf.value;
      });

      const fullIsoString = (record.date && record.time) 
        ? `${record.date.split('T')[0]}T${record.time}Z`
        : record.timestamp;

      return {
        timestamp: fullIsoString,
        time: this.formatTimeForApp(record.time || record.timestamp),
        pas: record.systolicBloodPressure,
        pad: record.diastolicBloodPressure,
        pam: record.meanArterialPressure,
        fc: record.heartRate,
        spo2: record.spo2,
        etco2: record.etco2,
        temp: record.temperature,
        bis: record.bis,
        pvc: record.pvc,
        pcap: record.pcap,
        custom: custom
      };
    });
  }

  private mapMonitoringAgentsToApp(records: any[]): any[] {
    if (!Array.isArray(records)) return [];

    const mapRouteToApp = (r: number) => {
      switch (r) {
        case 1: return 'IV';
        case 2: return 'IM';
        case 3: return 'SC';
        case 4: return 'VO';
        default: return 'IV';
      }
    };

    return records.map(record => {
      const fullIsoString = (record.date && record.time) 
        ? `${record.date.split('T')[0]}T${record.time}Z`
        : record.timestamp;

      return {
        timestamp: fullIsoString,
        time: this.formatTimeForApp(record.time || record.timestamp),
        dose: record.dose,
        via: mapRouteToApp(record.route),
        apresentacao: record.presentation,
        medicationId: record.drugId
      };
    });
  }

  private mapMonitoringEventsToApp(records: any[]): any[] {
    if (!Array.isArray(records)) return [];

    const mapEventTypeToApp = (t: number) => {
      switch (t) {
        case 1: return 'position';
        case 2: return 'airway';
        case 3: return 'surgical';
        case 4: return 'clinical';
        case 5: return 'medication';
        case 6: return 'anesthesia';
        default: return 'other';
      }
    };

    return records.map(record => {
      const fullIsoString = (record.date && record.time) 
        ? `${record.date.split('T')[0]}T${record.time}Z`
        : record.timestamp;

      return {
        timestamp: fullIsoString,
        time: this.formatTimeForApp(record.time || record.timestamp),
        type: mapEventTypeToApp(record.eventType),
        observacao: record.observations,
        descricao: record.description
      };
    });
  }

  private mapFluidBalanceToApp(records: any[]): any[] {
    if (!Array.isArray(records)) return [];

    const categoryMap: Record<number, string> = {
      1: 'Cristaloide',
      2: 'Coloide',
      3: 'Sangue e Derivados',
      4: 'Diurese',
      5: 'Sangramento',
      6: 'Dreno',
      7: 'Aspirado Gástrico',
      8: 'Outro'
    };

    return records.map(record => {
      const fullIsoString = (record.date && record.time) 
        ? `${record.date.split('T')[0]}T${record.time}Z`
        : record.timestamp;

      let itemName = record.details || record.description || record.item;
      const catId = record.categoryId || record.category;
      if (!itemName && catId) {
        itemName = categoryMap[catId] || 'Outro';
      }

      return {
        timestamp: fullIsoString,
        time: this.formatTimeForApp(record.time || record.timestamp),
        tipo: record.type === 2 ? 'loss' : 'gain', // mantendo para legado
        type: record.type === 2 ? 'loss' : 'gain', // adicionando o campo correto
        item: itemName,
        volume: record.volumeMl,     // mantendo para legado
        volumeMl: record.volumeMl,   // adicionando o campo correto
        itemId: catId,
        detail: record.description || null
      };
    });
  }

  private mapPositionsToApp(records: any[]): any[] {
    if (!Array.isArray(records)) return [];

    return records.map(record => {
      const fullIsoString = (record.date && record.time) 
        ? `${record.date.split('T')[0]}T${record.time}Z`
        : record.timestamp;

      return {
        timestamp: fullIsoString,
        time: this.formatTimeForApp(record.time || record.timestamp),
        posicao: this.POSITION_MAP[record.position] || record.position
      };
    });
  }

  private formatDateForInput(dateValue: any): string {
    if (!dateValue) {
      return new Date().toISOString().split('T')[0];
    }

    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('Data inválida para signatureDate:', dateValue);
    }

    return new Date().toISOString().split('T')[0];
  }
}
