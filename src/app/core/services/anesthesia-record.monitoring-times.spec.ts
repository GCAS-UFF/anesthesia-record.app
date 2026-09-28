import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AnesthesiaRecordService } from './anesthesia-record.service';
import { ApiService } from './base/api.service';
import { AuthService } from './auth.service';
import { SurgeryService } from './surgery.service';
import { SurgeryStatusEnum } from '../models/api-enums.model';

const SURGERY_ID = 987654;
const DRAFT_KEY = `draft_monitoring_${SURGERY_ID}`;
const FINALIZED_KEY = `finalized_monitoring_${SURGERY_ID}`;

/** ISO (UTC) de um horário local de hoje — o teste independe do fuso da máquina. */
const localIso = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

describe('AnesthesiaRecordService — horários da Monitorização', () => {
  let service: AnesthesiaRecordService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(FINALIZED_KEY);
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'put', 'patch', 'post', 'delete']);
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: { getCurrentUserId: () => 1, isAuthenticated: () => true } },
        { provide: SurgeryService, useValue: {} },
      ],
    });
    service = TestBed.inject(AnesthesiaRecordService);
  });

  afterEach(() => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(FINALIZED_KEY);
  });

  it('sem monitorização (servidor sem registro e sem rascunho) devolve tudo nulo', async () => {
    api.get.and.returnValue(throwError(() => ({ status: 404 })));

    const times = await firstValueFrom(service.getMonitoringTimes(SURGERY_ID));

    expect(times).toEqual({ status: null, anesthesiaStart: null, surgeryStart: null, surgeryEnd: null, anesthesiaEnd: null });
  });

  it('monitorização criada mas não iniciada (datas nulas) não gera horário', async () => {
    api.get.and.returnValue(of({ data: { status: SurgeryStatusEnum.Agendado, startedAt: null, endedAt: null, surgeryStartedAt: null, surgeryEndedAt: null } }));

    const times = await firstValueFrom(service.getMonitoringTimes(SURGERY_ID));

    expect(times.anesthesiaStart).toBeNull();
    expect(times.surgeryStart).toBeNull();
    expect(times.surgeryEnd).toBeNull();
    expect(times.anesthesiaEnd).toBeNull();
  });

  it('cirurgia iniciada e finalizada (monitorização concluída) devolve os 4 horários no fuso local', async () => {
    api.get.and.returnValue(of({
      data: {
        status: SurgeryStatusEnum.Concluido,
        startedAt: localIso(7, 50),
        surgeryStartedAt: localIso(8, 5),
        surgeryEndedAt: localIso(10, 40),
        endedAt: localIso(10, 55),
      },
    }));

    const times = await firstValueFrom(service.getMonitoringTimes(SURGERY_ID));

    expect(times).toEqual({
      status: SurgeryStatusEnum.Concluido,
      anesthesiaStart: '07:50',
      surgeryStart: '08:05',
      surgeryEnd: '10:40',
      anesthesiaEnd: '10:55',
    });
  });

  it('em andamento no servidor: descarta fim de anestesia fictício e fim de cirurgia sem início', async () => {
    api.get.and.returnValue(of({
      data: {
        status: SurgeryStatusEnum.EmProgresso,
        startedAt: localIso(7, 50),
        surgeryStartedAt: null,
        surgeryEndedAt: localIso(9, 0), // resíduo do PUT de progresso antigo
        endedAt: localIso(9, 0),        // idem
      },
    }));

    const times = await firstValueFrom(service.getMonitoringTimes(SURGERY_ID));

    expect(times.anesthesiaStart).toBe('07:50');
    expect(times.surgeryStart).toBeNull();
    expect(times.surgeryEnd).toBeNull();
    expect(times.anesthesiaEnd).toBeNull();
  });

  it('em andamento: o rascunho local (horários ainda não sincronizados) prevalece sobre o servidor', async () => {
    api.get.and.returnValue(of({ data: { status: SurgeryStatusEnum.EmProgresso, startedAt: localIso(7, 50) } }));
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      anesthesiaStartTime: localIso(7, 50),
      surgeryStartTime: localIso(8, 5),
      surgeryEndTime: null,
      anesthesiaEndTime: null,
    }));

    const times = await firstValueFrom(service.getMonitoringTimes(SURGERY_ID));

    expect(times.anesthesiaStart).toBe('07:50');
    expect(times.surgeryStart).toBe('08:05');
    expect(times.surgeryEnd).toBeNull();
  });

  it('monitorização concluída no servidor prevalece sobre rascunho local antigo', async () => {
    api.get.and.returnValue(of({
      data: { status: SurgeryStatusEnum.Concluido, startedAt: localIso(7, 50), surgeryStartedAt: localIso(8, 10), surgeryEndedAt: localIso(10, 0), endedAt: localIso(10, 20) },
    }));
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ anesthesiaStartTime: localIso(7, 0), surgeryStartTime: localIso(7, 30) }));

    const times = await firstValueFrom(service.getMonitoringTimes(SURGERY_ID));

    expect(times.surgeryStart).toBe('08:10');
    expect(times.anesthesiaEnd).toBe('10:20');
  });

  it('offline: usa o cache do registro finalizado', async () => {
    api.get.and.returnValue(throwError(() => ({ status: 0 })));
    localStorage.setItem(FINALIZED_KEY, JSON.stringify({
      startedAt: localIso(7, 50), surgeryStartedAt: localIso(8, 5), surgeryEndedAt: localIso(10, 40), endedAt: localIso(10, 55),
    }));

    const times = await firstValueFrom(service.getMonitoringTimes(SURGERY_ID));

    expect(times.surgeryEnd).toBe('10:40');
    expect(times.anesthesiaEnd).toBe('10:55');
  });

  it('PUT de progresso não envia término fictício; a finalização continua completando com "agora"', () => {
    api.put.and.returnValue(of({}));
    api.patch.and.returnValue(of({}));
    const draft = { anesthesiaStartTime: localIso(7, 50), surgeryStartTime: localIso(8, 5), surgeryEndTime: null, anesthesiaEndTime: null };

    service.saveMonitoringProgress(draft, SURGERY_ID).subscribe();
    const progress = api.put.calls.mostRecent().args[1] as any;
    expect(progress.endedAt).toBeNull();
    expect(progress.surgeryEndedAt).toBeNull();

    service.submitMonitoringRecord(draft, SURGERY_ID).subscribe();
    const final = api.patch.calls.mostRecent().args[1] as any;
    expect(final.endedAt).toEqual(jasmine.any(String));
    expect(final.surgeryEndedAt).toEqual(jasmine.any(String));
  });
});
