import {
  DrugCategoryEnum, FluidCategoryEnum, InfusionRateUnitEnum, MedicationUnitEnum, SurgeryStatusEnum,
} from 'src/app/core/models/api-enums.model';
import { ConsumptionSourceData } from 'src/app/core/models/consumption-summary.model';
import { buildConsumptionSummary, parseDoseText } from './consumption-summary.util';

const T = (hhmm: string) => `2026-09-28T${hhmm}:00.000Z`;

function source(monitoring: any, overrides: Partial<ConsumptionSourceData> = {}): ConsumptionSourceData {
  return {
    surgeryId: 1,
    monitoring,
    monitoringSource: 'local',
    pendingSync: false,
    monitoringStatus: SurgeryStatusEnum.EmProgresso,
    recordStatus: SurgeryStatusEnum.EmProgresso,
    ignoreAnesthesiaEnd: false,
    fichaSource: 'none',
    fichaMedications: [],
    oxygenSupplementation: null,
    drugCategories: {},
    weightKg: null,
    ...overrides,
  };
}

const liveMonitoring = (extra: any = {}) => ({ anesthesiaStartTime: T('10:00'), surgeryStartTime: T('10:10'), ...extra });
const finishedMonitoring = (extra: any = {}) => ({
  anesthesiaStartTime: T('10:00'), surgeryStartTime: T('10:10'), surgeryEndTime: T('11:50'), anesthesiaEndTime: T('12:00'),
  finalized: true, ...extra,
});

describe('buildConsumptionSummary', () => {
  describe('fármacos', () => {
    it('consolida administrações do mesmo fármaco sem perder o histórico e separa por categoria', () => {
      const summary = buildConsumptionSummary(source(liveMonitoring({
        agents: [
          { timestamp: T('10:05'), medicationId: 7, name: 'Propofol', doseValue: 100, unit: MedicationUnitEnum.Milligram, routeId: 1, isBolus: true },
          { timestamp: T('10:40'), medicationId: 7, name: 'Propofol', doseValue: 50, unit: 'mg', route: 'EV (Intravenosa)' },
          { timestamp: T('10:20'), medicationId: 9, name: 'Dipirona', doseValue: 1, unit: MedicationUnitEnum.Gram },
          { timestamp: T('10:30'), medicationId: 11, name: 'SF 0,9%', doseValue: 250, unit: MedicationUnitEnum.Milliliter },
        ],
      }), { drugCategories: { 7: DrugCategoryEnum.Anestesico, 11: DrugCategoryEnum.Solucao } }), new Date(T('11:00')));

      expect(summary.agents.length).toBe(1);
      const propofol = summary.agents[0];
      expect(propofol.administrations.length).toBe(2);
      expect(propofol.totals).toEqual([{ unit: 'mg', total: 150 }]);
      expect(propofol.routes).toEqual(['EV']);
      expect(propofol.administrations[0].isBolus).toBeTrue();

      expect(summary.medications.map(m => m.name)).toEqual(['Dipirona']);
      expect(summary.solutions.map(m => m.name)).toEqual(['SF 0,9%']);
      expect(summary.overview.administrations).toBe(4);
    });

    it('não soma doses de unidades diferentes', () => {
      const summary = buildConsumptionSummary(source(liveMonitoring({
        agents: [
          { timestamp: T('10:05'), medicationId: 5, name: 'Fentanil', doseValue: 100, unit: MedicationUnitEnum.Microgram },
          { timestamp: T('10:15'), medicationId: 5, name: 'Fentanil', doseValue: 2, unit: MedicationUnitEnum.Milliliter },
        ],
      })), new Date(T('11:00')));

      expect(summary.medications[0].totals).toEqual([{ unit: 'mcg', total: 100 }, { unit: 'mL', total: 2 }]);
    });

    it('inclui antibióticos e repiques da ficha; dose em texto livre fica fora do total', () => {
      const summary = buildConsumptionSummary(source(liveMonitoring(), {
        fichaMedications: [
          { origin: 'antibiotic', medicationId: 20, name: 'Cefazolina', doseText: '2g', route: 'IV', time: '10:02' },
          { origin: 'booster', medicationId: 20, name: 'Cefazolina', doseText: '1 g', route: 'IV', time: '14:02' },
          { origin: 'booster', medicationId: 20, name: 'Cefazolina', doseText: '1 ampola', route: 'IV', time: '18:02' },
        ],
      }), new Date(T('11:00')));

      const atb = summary.medications[0];
      expect(atb.category).toBe(DrugCategoryEnum.Antibiotico);
      expect(atb.administrations.length).toBe(3);
      expect(atb.totals).toEqual([{ unit: 'g', total: 3 }]);
      expect(atb.unparsedCount).toBe(1);
    });
  });

  describe('balanço hídrico', () => {
    it('soma ganhos e perdas do balanço, identifica hidratação e não inclui bombas', () => {
      const summary = buildConsumptionSummary(source(liveMonitoring({
        fluidBalance: [
          { timestamp: T('10:05'), type: 'gain', item: 'Ringer lactato', volumeMl: 500, itemId: 'aghu_3', categoryId: FluidCategoryEnum.Other },
          { timestamp: T('10:35'), type: 'gain', item: 'Ringer lactato', volumeMl: 250, itemId: 'aghu_3', categoryId: FluidCategoryEnum.Other },
          { timestamp: T('10:20'), type: 'gain', item: 'Hidratação', volumeMl: 100, itemId: null, categoryId: null },
          { timestamp: T('10:50'), type: 'loss', item: 'Diurese', volumeMl: 300, itemId: 'urine', categoryId: FluidCategoryEnum.Diuresis },
        ],
        infusionPumps: [
          { timestamp: T('10:00'), medicationId: 3, medicationName: 'SF', rate: 100, rateUnit: 1, volumeMl: 500, endAt: T('15:00') },
        ],
      })), new Date(T('11:00')));

      expect(summary.fluids.totalGainMl).toBe(850);
      expect(summary.fluids.totalLossMl).toBe(300);
      expect(summary.fluids.balanceMl).toBe(550);
      const ringer = summary.fluids.gainsByItem.find(g => g.label === 'Ringer lactato')!;
      expect(ringer.totalMl).toBe(750);
      expect(ringer.entries.length).toBe(2);
      expect(summary.fluids.gainsByItem.some(g => g.isHydration && g.totalMl === 100)).toBeTrue();
    });
  });

  describe('bombas de infusão', () => {
    it('parada registrada: tempo até a parada e volume = vazão × horas', () => {
      const summary = buildConsumptionSummary(source(finishedMonitoring({
        infusionPumps: [{ timestamp: T('10:00'), medicationId: 3, medicationName: 'Remifentanil', rate: 100, rateUnit: InfusionRateUnitEnum.MillilitersPerHour, volumeMl: 500, endAt: T('10:30') }],
      })), new Date(T('13:00')));

      const pump = summary.pumps[0];
      expect(pump.endBasis).toBe('stopped');
      expect(pump.durationMin).toBe(30);
      expect(pump.infusedVolumeMl).toBe(50);
    });

    it('fim programado pelo volume já alcançado: volume limitado ao programado', () => {
      const summary = buildConsumptionSummary(source(finishedMonitoring({
        infusionPumps: [{ timestamp: T('10:00'), medicationId: 3, rate: 100, rateUnit: 'mL/h', volumeMl: 100, endAt: T('11:00') }],
      })), new Date(T('13:00')));

      expect(summary.pumps[0].endBasis).toBe('volume-completed');
      expect(summary.pumps[0].durationMin).toBe(60);
      expect(summary.pumps[0].infusedVolumeMl).toBe(100);
    });

    it('sem parada registrada e anestesia encerrada antes do fim programado: limita ao término da anestesia', () => {
      const summary = buildConsumptionSummary(source(finishedMonitoring({
        infusionPumps: [{ timestamp: T('10:00'), medicationId: 3, rate: 100, rateUnit: 1, volumeMl: 500, endAt: T('15:00') }],
      })), new Date(T('16:00')));

      expect(summary.pumps[0].endBasis).toBe('capped-anesthesia-end');
      expect(summary.pumps[0].durationMin).toBe(120);
      expect(summary.pumps[0].infusedVolumeMl).toBe(200);
    });

    it('em andamento: conta até agora', () => {
      const summary = buildConsumptionSummary(source(liveMonitoring({
        infusionPumps: [{ timestamp: T('10:00'), medicationId: 3, rate: 100, rateUnit: 1, volumeMl: 500, endAt: T('15:00') }],
      })), new Date(T('10:45')));

      expect(summary.pumps[0].isRunning).toBeTrue();
      expect(summary.pumps[0].durationMin).toBe(45);
      expect(summary.pumps[0].infusedVolumeMl).toBe(75);
      expect(summary.overview.runningPumps).toBe(1);
    });

    it('janela padrão de 2 h (fora de mL/h) não é tratada como término real', () => {
      const summary = buildConsumptionSummary(source(finishedMonitoring({
        infusionPumps: [{ timestamp: T('10:00'), medicationId: 4, rate: 0.1, rateUnit: InfusionRateUnitEnum.MicrogramsPerKgPerMinute, volumeMl: 50, endAt: T('12:00') }],
      }), { weightKg: 70 }), new Date(T('13:00')));

      expect(summary.pumps[0].endBasis).toBe('not-registered');
      expect(summary.pumps[0].durationMin).toBeNull();
      expect(summary.pumps[0].infusedAmount).toBeNull();
    });

    it('mcg/kg/min com peso da ficha e parada registrada: quantidade calculada', () => {
      const summary = buildConsumptionSummary(source(finishedMonitoring({
        infusionPumps: [{ timestamp: T('10:00'), medicationId: 4, rate: 0.1, rateUnit: InfusionRateUnitEnum.MicrogramsPerKgPerMinute, volumeMl: 50, endAt: T('11:00') }],
      }), { weightKg: 70 }), new Date(T('13:00')));

      expect(summary.pumps[0].endBasis).toBe('stopped');
      expect(summary.pumps[0].infusedAmount).toEqual({ unit: 'mcg', total: 420 });
      expect(summary.pumps[0].infusedVolumeMl).toBeNull();
    });
  });

  describe('O₂ e ar comprimido', () => {
    it('soma intervalos ligado→desligado e conta o intervalo aberto até agora quando em andamento', () => {
      const summary = buildConsumptionSummary(source(liveMonitoring({
        oxygenFlows: [
          { timestamp: T('10:00'), isActive: true, flowRateLPerMin: 2 },
          { timestamp: T('10:30'), isActive: false, flowRateLPerMin: null },
          { timestamp: T('11:00'), isActive: true, flowRateLPerMin: null },
        ],
      })), new Date(T('11:15')));

      const o2 = summary.gases.o2;
      expect(o2.intervals.length).toBe(2);
      expect(o2.totalMin).toBe(45);
      expect(o2.isActive).toBeTrue();
      expect(o2.intervals[0].volumeL).toBe(60);
      expect(o2.totalVolumeL).toBeNull(); // segundo intervalo sem fluxo registrado
      expect(summary.gases.air.totalMin).toBeNull();
      expect(summary.gases.air.intervals.length).toBe(0);
    });

    it('sem desligamento registrado e anestesia encerrada: limita ao término da anestesia', () => {
      const summary = buildConsumptionSummary(source(finishedMonitoring({
        compressedAirFlows: [{ timestamp: T('11:00'), isActive: true }],
      })), new Date(T('15:00')));

      const air = summary.gases.air;
      expect(air.intervals[0].endBasis).toBe('capped-anesthesia-end');
      expect(air.totalMin).toBe(60);
      expect(air.isActive).toBeFalse();
    });
  });

  describe('fase e horários', () => {
    it('ficha finalizada: consolidado definitivo, sem contagem "até agora"', () => {
      const summary = buildConsumptionSummary(source(finishedMonitoring(), {
        monitoringSource: 'server', monitoringStatus: SurgeryStatusEnum.Concluido, recordStatus: SurgeryStatusEnum.Concluido,
      }), new Date(T('20:00')));

      expect(summary.phase).toBe('finalized');
      expect(summary.isLive).toBeFalse();
      expect(summary.times.anesthesiaMin).toBe(120);
      expect(summary.times.surgeryMin).toBe(100);
    });

    it('descarta fim de anestesia residual de registro do servidor ainda em andamento', () => {
      const summary = buildConsumptionSummary(source({ startedAt: T('10:00'), endedAt: T('10:01') }, {
        monitoringSource: 'server', ignoreAnesthesiaEnd: true,
      }), new Date(T('11:00')));

      expect(summary.phase).toBe('in-progress');
      expect(summary.times.anesthesiaEnd).toBeNull();
      expect(summary.times.anesthesiaMin).toBe(60);
    });

    it('sem monitorização: nada é inventado', () => {
      const summary = buildConsumptionSummary(source(null, { monitoringSource: 'none', monitoringStatus: null, recordStatus: null }));

      expect(summary.phase).toBe('not-started');
      expect(summary.times.anesthesiaMin).toBeNull();
      expect(summary.gases.o2.totalMin).toBeNull();
      expect(summary.pumps.length).toBe(0);
      expect(summary.fluids.entryCount).toBe(0);
    });
  });
});

describe('parseDoseText', () => {
  it('interpreta número e unidade', () => {
    expect(parseDoseText('2g')).toEqual({ value: 2, unit: 'g' });
    expect(parseDoseText('1,5 ML')).toEqual({ value: 1.5, unit: 'mL' });
    expect(parseDoseText('100 mcg')).toEqual({ value: 100, unit: 'mcg' });
  });

  it('texto livre não numérico devolve null', () => {
    expect(parseDoseText('1 ampola de 2 mL')).toBeNull();
    expect(parseDoseText('')).toBeNull();
  });
});
