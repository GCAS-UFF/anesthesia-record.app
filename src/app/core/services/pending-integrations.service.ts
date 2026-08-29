import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { AnesthesiaRecordService } from './anesthesia-record.service';
import { PreAnesthesicRecordService } from './pre-anesthesic-record.service';
import { SurgeryService } from './surgery.service';
import { AuthService } from './auth.service';
import { Patient } from '../../shared/models/patient.model';

export type IntegrationType = 'preAnesthesia' | 'anesthesia' | 'monitoring';
export type IntegrationStatus = 'pending' | 'error' | 'integrated';

export interface IntegrationError {
  message?: string;
  httpStatus?: number;
  endpoint?: string;
  attempts?: number;
  lastAttemptAt?: string;
}

export interface PendingIntegration {
  id: string;
  type: IntegrationType;
  patient: {
    id?: string;
    name?: string;
    medicalRecordNumber?: string;
  };
  surgeryId?: string;
  surgeryDate?: string;
  updatedAt?: string;
  status: IntegrationStatus;
  payload: unknown;
  error?: IntegrationError;
  canSendNow: boolean;
  requiresNavigation: boolean;
  navigateRoute?: any[];
  blockedReason?: string;
}

const ANESTHESIA_PREFIX = 'draft_anesthesia_';
const MONITORING_PREFIX = 'draft_monitoring_';
const SENT_LOG_KEY = 'integration_sent_log';
const SENT_LOG_MAX = 50;

@Injectable({
  providedIn: 'root',
})
export class PendingIntegrationsService {
  private changedSubject = new Subject<void>();
  changed$ = this.changedSubject.asObservable();

  private patientsCache: Patient[] | null = null;
  private patientsCachePromise: Promise<Patient[]> | null = null;

  constructor(
    private anesthesiaRecordService: AnesthesiaRecordService,
    private preAnesthesicService: PreAnesthesicRecordService,
    private surgeryService: SurgeryService,
    private authService: AuthService,
  ) {}

  async list(): Promise<PendingIntegration[]> {
    await this.ensurePatientsLoaded();

    const items: PendingIntegration[] = [
      ...this.safeCollect('anesthesia', () => this.collectAnesthesiaDrafts()),
      ...this.safeCollect('monitoring', () => this.collectMonitoringDrafts()),
      ...this.safeCollect('preAnesthesia', () => this.collectPreAnesthesiaDrafts()),
    ];

    items.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    return items;
  }

  /**
   * Uma falha ao coletar um tipo (ex.: draft com formato inesperado) nunca deve
   * derrubar a lista inteira — sem isso, um único item problemático fazia a tela
   * inteira aparecer vazia mesmo com outros drafts válidos no storage.
   */
  private safeCollect(label: string, fn: () => PendingIntegration[]): PendingIntegration[] {
    try {
      return fn();
    } catch (err) {
      console.error(`[PendingIntegrationsService] falha ao coletar pendências de ${label}`, err);
      return [];
    }
  }

  async refreshPatients(): Promise<void> {
    this.patientsCache = null;
    this.patientsCachePromise = null;
    await this.ensurePatientsLoaded();
  }

  getSentCount(): number {
    return this.readSentLog().length;
  }

  getSentLog(): { type: IntegrationType; patientName?: string; sentAt: string }[] {
    return [...this.readSentLog()].reverse();
  }

  async sendOne(item: PendingIntegration): Promise<{ ok: boolean; message?: string }> {
    try {
      if (item.type === 'preAnesthesia') {
        throw new Error('Este tipo de registro precisa ser assinado na própria tela da Ficha Pré-Anestésica.');
      }

      await this.sendAnesthesiaOrMonitoring(item);
      this.appendSentLog(item);
      this.changedSubject.next();
      return { ok: true };
    } catch (err: any) {
      this.recordError(item, err);
      this.changedSubject.next();
      return { ok: false, message: this.extractErrorMessage(err) };
    }
  }

  async sendAll(items: PendingIntegration[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const item of items) {
      if (!item.canSendNow || item.requiresNavigation) continue;

      const result = await this.sendOne(item);
      if (result.ok) success++;
      else failed++;
    }

    return { success, failed };
  }

  // --- Coleta -----------------------------------------------------------

  private collectAnesthesiaDrafts(): PendingIntegration[] {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(ANESTHESIA_PREFIX))
      .map((key) => {
        const draft = this.safeParse(localStorage.getItem(key));
        if (!draft) return null;

        const patientId = this.pick(draft.patientId, draft.pacienteId);
        const surgeryId = String(this.pick(draft.surgeryId, draft.cirurgiaId, key.slice(ANESTHESIA_PREFIX.length)));
        const patientInfo = this.resolvePatient(surgeryId, patientId);
        const hasError = !!draft._isErrorDraft;

        const item: PendingIntegration = {
          id: key,
          type: 'anesthesia',
          patient: { id: patientId, name: patientInfo.name, medicalRecordNumber: patientInfo.medicalRecordNumber },
          surgeryId,
          surgeryDate: patientInfo.surgeryDate,
          updatedAt: draft.updatedAt ?? draft._lastRetry ?? draft._timestamp ?? draft._createdAt,
          status: hasError ? 'error' : 'pending',
          payload: draft,
          canSendNow: true,
          requiresNavigation: false,
        };

        if (hasError) {
          item.error = {
            message: draft._lastError || draft._error,
            attempts: draft._retryCount,
            lastAttemptAt: draft._lastRetry || draft._timestamp,
            endpoint: `anesthesiarecord/${surgeryId}`,
            httpStatus: draft._httpStatus,
          };
        }

        return item;
      })
      .filter((item): item is PendingIntegration => !!item);
  }

  private collectMonitoringDrafts(): PendingIntegration[] {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(MONITORING_PREFIX))
      .map((key) => {
        const draft = this.safeParse(localStorage.getItem(key));
        if (!draft) return null;

        const surgeryId = String(this.pick(draft.surgeryId, draft.cirurgiaId, draft.id, key.slice(MONITORING_PREFIX.length)));
        const patientInfo = this.resolvePatient(surgeryId, undefined);
        const hasError = !!draft._isErrorDraft;
        const finalized = !!draft.finalized;

        const item: PendingIntegration = {
          id: key,
          type: 'monitoring',
          patient: { name: patientInfo.name, medicalRecordNumber: patientInfo.medicalRecordNumber },
          surgeryId,
          surgeryDate: patientInfo.surgeryDate,
          updatedAt: draft.monitoringUpdatedAt ?? draft._lastRetry,
          status: hasError ? 'error' : 'pending',
          payload: draft,
          canSendNow: finalized,
          requiresNavigation: false,
          blockedReason: finalized ? undefined : 'Aguardando o término da cirurgia para poder ser enviada.',
        };

        if (hasError) {
          item.error = {
            message: draft._lastError || draft._error,
            attempts: draft._retryCount,
            lastAttemptAt: draft._lastRetry,
            endpoint: `MonitoringRecord/${surgeryId}`,
            httpStatus: draft._httpStatus,
          };
        }

        return item;
      })
      .filter((item): item is PendingIntegration => !!item);
  }

  private collectPreAnesthesiaDrafts(): PendingIntegration[] {
    return this.preAnesthesicService
      .listDraftKeys()
      .map(({ anesthesiaRecordId, patientId }) => {
        const draft = this.preAnesthesicService.getBestAvailable(anesthesiaRecordId, patientId);
        if (!draft) return null;

        const surgeryId = String(anesthesiaRecordId);
        const patientInfo = this.resolvePatient(surgeryId, patientId);

        const item: PendingIntegration = {
          id: `draft_pre_anesthesia_${anesthesiaRecordId}_${patientId}`,
          type: 'preAnesthesia',
          patient: { id: patientId, name: patientInfo.name, medicalRecordNumber: patientInfo.medicalRecordNumber },
          surgeryId,
          surgeryDate: patientInfo.surgeryDate,
          status: 'pending',
          payload: draft,
          canSendNow: false,
          requiresNavigation: true,
          navigateRoute: ['/pre-anesthesia-record', anesthesiaRecordId, patientId],
          blockedReason: 'Precisa ser revisada e assinada com senha na própria Ficha Pré-Anestésica.',
        };

        return item;
      })
      .filter((item): item is PendingIntegration => !!item);
  }

  // --- Envio --------------------------------------------------------------

  private async sendAnesthesiaOrMonitoring(item: PendingIntegration): Promise<void> {
    await firstValueFrom(this.anesthesiaRecordService.saveRecord(item.payload));
    localStorage.removeItem(item.id);

    if (item.type === 'monitoring' && item.surgeryId) {
      // Caches de referência somente-leitura (usados pela tela de Monitorização para
      // mostrar a Ficha Pré-Anestésica e a Ficha Anestésica offline) só fazem sentido
      // enquanto a cirurgia está em andamento — uma vez que a monitorização é
      // efetivamente integrada, a cirurgia terminou e eles podem ser descartados.
      localStorage.removeItem(`preAnesthesiaData_${item.surgeryId}`);
      localStorage.removeItem(`cache_ficha_anestesica_${item.surgeryId}`);
    }

    this.anesthesiaRecordService.updatePendingStatus();
  }

  private recordError(item: PendingIntegration, err: any): void {
    if (item.type === 'preAnesthesia') return;

    try {
      const raw = localStorage.getItem(item.id);
      if (!raw) return;

      const draft = JSON.parse(raw);
      const message = this.extractErrorMessage(err);
      const nowIso = new Date().toISOString();

      const updated = {
        ...draft,
        _isErrorDraft: true,
        _error: message,
        _lastError: message,
        _timestamp: draft._timestamp ?? nowIso,
        _lastRetry: nowIso,
        _retryCount: (draft._retryCount || 0) + 1,
        _httpStatus: err?.status ?? draft._httpStatus,
      };

      localStorage.setItem(item.id, JSON.stringify(updated));
    } catch {
      // melhor esforço: não perder o rascunho original se o registro do erro falhar
    }
  }

  private extractErrorMessage(err: any): string {
    return err?.error?.message || err?.message || 'Erro desconhecido ao integrar.';
  }

  // --- Resolução de paciente -----------------------------------------------

  private async ensurePatientsLoaded(): Promise<Patient[]> {
    if (this.patientsCache) return this.patientsCache;

    if (!this.patientsCachePromise) {
      this.patientsCachePromise = this.loadPatients();
    }

    this.patientsCache = await this.patientsCachePromise;
    return this.patientsCache;
  }

  /**
   * Envolvida inteira em try/catch (inclusive a chamada síncrona a getMyPatients)
   * porque qualquer exceção aqui não pode derrubar list() — resolução de paciente
   * é só para exibição amigável, nunca deve impedir os drafts de aparecerem.
   */
  private async loadPatients(): Promise<Patient[]> {
    try {
      const doctorId = this.authService.getCurrentUserId();
      if (!doctorId) return [];

      const res: any = await firstValueFrom(
        this.surgeryService.getMyPatients(doctorId, undefined, undefined, null, 1, 200),
      );
      // A API às vezes envolve a resposta num envelope extra ({ valid, data: PatientResponse })
      // e às vezes devolve o PatientResponse direto — mesmo padrão defensivo já usado em
      // my-patients.page.ts (response.data || response) para lidar com as duas formas.
      const resultData = res?.data || res;
      const patients = resultData?.data;
      return Array.isArray(patients) ? patients : [];
    } catch (err) {
      console.error('[PendingIntegrationsService] falha ao carregar pacientes para resolver nomes', err);
      return [];
    }
  }

  private resolvePatient(
    surgeryId?: string,
    patientId?: string,
  ): { name?: string; medicalRecordNumber?: string; surgeryDate?: string } {
    const patients = Array.isArray(this.patientsCache) ? this.patientsCache : [];
    let found: Patient | undefined;

    if (patientId) {
      found = patients.find((p) => String(p.patientId) === String(patientId));
    }
    if (!found && surgeryId) {
      found = patients.find((p) => p.surgeries?.some((s) => String(s.id) === String(surgeryId)));
    }

    const matchedSurgery = found?.surgeries?.find((s) => String(s.id) === String(surgeryId));

    return {
      name: found?.fullName,
      medicalRecordNumber: found?.medicalRecordNumber,
      surgeryDate: matchedSurgery?.surgeryDate,
    };
  }

  // --- Log de enviados (aditivo, não é histórico retroativo) --------------

  private appendSentLog(item: PendingIntegration): void {
    try {
      const log = this.readSentLog();
      log.push({ type: item.type, patientName: item.patient.name, sentAt: new Date().toISOString() });
      const trimmed = log.slice(-SENT_LOG_MAX);
      localStorage.setItem(SENT_LOG_KEY, JSON.stringify(trimmed));
    } catch {
      // best-effort
    }
  }

  private readSentLog(): { type: IntegrationType; patientName?: string; sentAt: string }[] {
    try {
      const raw = localStorage.getItem(SENT_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // --- Utilitários ----------------------------------------------------------

  private safeParse(value: string | null): any | null {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private pick<T>(...values: T[]): T | undefined {
    for (const v of values) {
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  }
}
