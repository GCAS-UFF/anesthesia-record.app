import { Injectable } from '@angular/core';
import { combineLatest, fromEvent, merge, Observable, of, timer } from 'rxjs';
import {
  catchError, distinctUntilChanged, exhaustMap, filter, map, pairwise, scan, shareReplay, startWith, takeWhile,
} from 'rxjs/operators';

import { DrugCategoryEnum, SurgeryStatusEnum } from '../models/api-enums.model';
import {
  ConsumptionSourceData, ConsumptionSummaryState, FichaMedicationInput,
} from '../models/consumption-summary.model';
import { buildConsumptionSummary } from '../../shared/utils/consumption-summary.util';
import { AnesthesiaRecordService } from './anesthesia-record.service';
import { ApiService } from './base/api.service';
import { MasterDataService } from './master-data.service';

interface ConsumptionApiResponse {
  surgeryId: number;
  anesthesiaRecordStatus: SurgeryStatusEnum | null;
  monitoringStatus: SurgeryStatusEnum | null;
  weightKg: number | null;
  monitoring: any;
  drugCategories: Record<string, DrugCategoryEnum>;
  preAnestheticMedication: { medicationId: number | null; name: string | null; dose: string | null; route: string | null; time: string | null } | null;
  antibiotics: any[];
  oxygenSupplementation: boolean | null;
  oxygenSupplementationTypes: string[];
  oxygenSupplementationOther: string | null;
}

interface ServerState {
  loaded: boolean;
  response: ConsumptionApiResponse | null;
  forbidden: boolean;  
  notFound: boolean;
  failed: boolean;
  syncedAt: string | null;
}

interface LocalState {
  monitoringDraft: any | null;
  fichaDraft: any | null;
}

@Injectable({ providedIn: 'root' })
export class ConsumptionSummaryService {
  static readonly SERVER_REFRESH_MS = 30_000;
  static readonly LOCAL_CHECK_MS = 5_000;  
  static readonly CLOCK_MS = 30_000;

  constructor(
    private api: ApiService,
    private anesthesiaRecordService: AnesthesiaRecordService,
    private masterData: MasterDataService,
  ) {}

  watch(surgeryId: number): Observable<ConsumptionSummaryState> {
    const local$ = merge(
      timer(0, ConsumptionSummaryService.LOCAL_CHECK_MS),
      typeof window !== 'undefined' ? fromEvent(window, 'storage') : of(null),
    ).pipe(
      map(() => this.readLocalRaw(surgeryId)),
      distinctUntilChanged((a, b) => a === b),
      map(() => this.readLocal(surgeryId)),
    );

    const clock$ = timer(0, ConsumptionSummaryService.CLOCK_MS);

    return combineLatest([this.serverState$(surgeryId), local$, clock$]).pipe(
      map(([server, local]) => this.compose(surgeryId, server, local)),
      startWith<ConsumptionSummaryState>({ summary: null, loading: true, error: null, serverSyncedAt: null }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  private serverState$(surgeryId: number): Observable<ServerState> {
    const syncFinished$ = this.anesthesiaRecordService.syncing$.pipe(
      pairwise(),
      filter(([before, after]) => before && !after),
    );

    const initial: ServerState = { loaded: false, response: null, forbidden: false, notFound: false, failed: false, syncedAt: null };

    return merge(timer(0, ConsumptionSummaryService.SERVER_REFRESH_MS), syncFinished$).pipe(
      exhaustMap(() => this.fetch(surgeryId)),      
      scan((prev: ServerState, next: Partial<ServerState>) => {
        if (next.response) return { ...initial, loaded: true, response: next.response, syncedAt: new Date().toISOString() };
        if (next.forbidden || next.notFound) return { ...initial, loaded: true, forbidden: !!next.forbidden, notFound: !!next.notFound };
        return { ...prev, loaded: true, failed: true };
      }, initial),      
      takeWhile(s => s.response?.anesthesiaRecordStatus !== SurgeryStatusEnum.Concluido && !s.forbidden, true),
      startWith(initial),
    );
  }

  private fetch(surgeryId: number): Observable<Partial<ServerState>> {
    return this.api.get<any>(`MonitoringRecord/${surgeryId}/consumption`).pipe(
      map((res: any) => ({ response: (res?.data ?? null) as ConsumptionApiResponse | null })),
      map(r => (r.response && Number(r.response.surgeryId) === Number(surgeryId) ? r : { failed: true })),
      catchError(err => of(
        err?.status === 403 ? { forbidden: true }
          : err?.status === 404 ? { notFound: true }
            : { failed: true },
      )),
    );
  }

  private readLocalRaw(surgeryId: number): string {
    return `${localStorage.getItem(`draft_monitoring_${surgeryId}`) ?? ''}\u0000${localStorage.getItem(`draft_anesthesia_${surgeryId}`) ?? ''}`;
  }

  private readLocal(surgeryId: number): LocalState {
    const belongs = (draft: any) => {
      if (!draft) 
        return false;
      
      const ids = [draft.surgeryId, draft.cirurgiaId, draft.id].filter(v => v != null && v !== '');
      
      return ids.length === 0 || ids.some(v => Number(v) === Number(surgeryId));
    };
    const monitoringDraft = safeParse(localStorage.getItem(`draft_monitoring_${surgeryId}`));
    const fichaDraft = this.anesthesiaRecordService.getDraft(String(surgeryId));
    return {
      monitoringDraft: belongs(monitoringDraft) ? monitoringDraft : null,
      fichaDraft: belongs(fichaDraft) ? fichaDraft : null,
    };
  }

  private compose(surgeryId: number, server: ServerState, local: LocalState): ConsumptionSummaryState {
    const base = { serverSyncedAt: server.syncedAt };
    
    if (server.forbidden) 
      return { ...base, summary: null, loading: false, error: 'forbidden' };

    const resp = server.response;
    const recordStatus = resp?.anesthesiaRecordStatus ?? null;
    const serverMonitoringStatus = resp?.monitoringStatus ?? null;
    const serverFinished = serverMonitoringStatus === SurgeryStatusEnum.Concluido;

    let monitoring: any = null;
    let monitoringSource: ConsumptionSourceData['monitoringSource'] = 'none';
    let pendingSync = false;
    let ignoreAnesthesiaEnd = false;

    if (resp && serverFinished) {
      monitoring = this.anesthesiaRecordService.mapMonitoringPayloadToApp(resp.monitoring ?? {});
      monitoringSource = 'server';
    } else if (local.monitoringDraft) {
      monitoring = local.monitoringDraft;
      monitoringSource = 'local';
      const d = local.monitoringDraft;
      pendingSync = !(d._lastSyncedAt && d.monitoringUpdatedAt && d._lastSyncedAt >= d.monitoringUpdatedAt);
    } else if (resp) {
      monitoring = this.anesthesiaRecordService.mapMonitoringPayloadToApp(resp.monitoring ?? {});
      monitoringSource = 'server';
      ignoreAnesthesiaEnd = true;
    } else {
      const cached = this.anesthesiaRecordService.getFinalizedMonitoringRecord(surgeryId);
      if (cached) {
        const isApiFormat = Array.isArray(cached.administeredAgents) || Array.isArray(cached.vitalSigns);
        monitoring = isApiFormat ? this.anesthesiaRecordService.mapMonitoringPayloadToApp(cached) : cached;
        monitoringSource = 'cache';
      }
    }

    if (!server.loaded && monitoringSource === 'none')
      return { ...base, summary: null, loading: true, error: null };

    if (server.failed && !resp && monitoringSource === 'none')
      return { ...base, summary: null, loading: false, error: 'unavailable' };

    const useLocalFicha = !!local.fichaDraft && recordStatus !== SurgeryStatusEnum.Concluido;
    const fichaMedications = useLocalFicha
      ? fichaMedicationsFromDraft(local.fichaDraft)
      : resp ? fichaMedicationsFromServer(resp) : [];

    const data: ConsumptionSourceData = {
      surgeryId,
      monitoring,
      monitoringSource,
      pendingSync: pendingSync || useLocalFicha,
      monitoringStatus: serverMonitoringStatus,
      recordStatus,
      ignoreAnesthesiaEnd,
      fichaSource: useLocalFicha ? 'local' : resp ? 'server' : 'none',
      fichaMedications,
      oxygenSupplementation: resp?.oxygenSupplementation
        ? { types: resp.oxygenSupplementationTypes ?? [], other: resp.oxygenSupplementationOther ?? null }
        : null,
      drugCategories: this.drugCategories(resp),
      weightKg: (useLocalFicha ? toNumber(local.fichaDraft?.dadosVitais?.peso) : null) ?? toNumber(resp?.weightKg),
    };

    return { ...base, summary: buildConsumptionSummary(data), loading: false, error: null };
  }
  
  private drugCategories(resp: ConsumptionApiResponse | null): Record<number, DrugCategoryEnum> {
    const result: Record<number, DrugCategoryEnum> = {};
    for (const m of asArray(this.masterData.getMedicationsCache())) {
      const category = m?.category ?? m?.categoryId;
      if (m?.id != null && typeof category === 'number') result[Number(m.id)] = category;
    }
    for (const [id, category] of Object.entries(resp?.drugCategories ?? {})) {
      result[Number(id)] = category;
    }
    return result;
  }
}

function fichaMedicationsFromServer(resp: ConsumptionApiResponse): FichaMedicationInput[] {
  const items: FichaMedicationInput[] = [];
  const pre = resp.preAnestheticMedication;
  if (pre && (pre.name || pre.medicationId)) {
    items.push({
      origin: 'pre-anesthetic',
      medicationId: pre.medicationId ?? null,
      name: pre.name ?? '',
      doseText: pre.dose ?? '',
      route: pre.route || null,
      time: hhmm(pre.time),
    });
  }
  for (const atb of asArray(resp.antibiotics)) {
    const name = atb.medicationName || atb.name || '';
    items.push({ origin: 'antibiotic', medicationId: atb.medicationId || null, name, doseText: atb.dose ?? '', route: atb.route || null, time: hhmm(atb.time) });
    for (const b of asArray(atb.boosters)) {
      items.push({
        origin: 'booster',
        medicationId: b.medicationId || atb.medicationId || null,
        name: b.medicationName || b.name || name,
        doseText: b.dose ?? '',
        route: b.route || atb.route || null,
        time: hhmm(b.time),
      });
    }
  }
  return items;
}

function fichaMedicationsFromDraft(draft: any): FichaMedicationInput[] {
  const items: FichaMedicationInput[] = [];
  const pre = draft?.preInducao ?? {};
  if (pre.recebeuMedPrevia === 'sim' && (pre.farmaco || pre.farmacoId)) {
    items.push({
      origin: 'pre-anesthetic',
      medicationId: numericId(pre.farmacoId ?? pre.medication?.id),
      name: pre.farmaco ?? pre.medication?.name ?? '',
      doseText: pre.dose ?? pre.dosagem ?? '',
      route: (pre.via === 'Outras' ? pre.outrasVia : pre.via) || null,
      time: hhmm(pre.hora),
    });
  }
  if (draft?.antibiotico?.temAntibiotico !== 'nao') {
    for (const atb of asArray(draft?.antibioticsList)) {
      const name = atb.medicationName ?? atb.nome ?? '';
      items.push({ origin: 'antibiotic', medicationId: numericId(atb.medicationId), name, doseText: atb.dose ?? '', route: atb.via || null, time: hhmm(atb.hora) });
      for (const r of asArray(atb.repiques)) {
        items.push({
          origin: 'booster',
          medicationId: numericId(r.medicationId ?? atb.medicationId),
          name: r.medicationName ?? r.nome ?? name,
          doseText: r.dose ?? '',
          route: r.via || atb.via || null,
          time: hhmm(r.hora),
        });
      }
    }
  }
  return items;
}

function hhmm(value: any): string | null {
  return typeof value === 'string' && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : null;
}

function numericId(value: any): number | null {
  if (typeof value === 'string' && !/^\d+$/.test(value)) return null; // "custom-..." = fora do cadastro
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function asArray(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  return [];
}

function safeParse(raw: string | null): any | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
