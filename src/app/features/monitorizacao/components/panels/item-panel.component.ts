import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { MasterDataService } from 'src/app/core/services/master-data.service';
import {
  ADMINISTRATION_ROUTE_LABELS, AdministrationRouteEnum, ClinicalEventTypeEnum, FluidBalanceTypeEnum,
  FluidCategoryEnum, FLUID_CATEGORY_KEY_TO_ID, INFUSION_RATE_UNIT_LABELS, InfusionRateUnitEnum,
  MEDICATION_UNIT_LABELS, MedicationUnitEnum,
} from 'src/app/core/models/api-enums.model';
import { Agent } from '../../models/monitoring-view.model';
import { keypadToNumber, NumericKeypadComponent, numberToKeypad } from './numeric-keypad.component';

export type ItemPanelType = 'agent' | 'event' | 'balance';
type AgentMode = 'dose' | 'bolus' | 'pump';
type NumField = 'dose' | 'rate' | 'volume' | 'balanceVolume';

interface Medication { id: number | string; description: string; }
interface EventTypeOption { id: number; name: string; description: string; }
interface BalanceItem { id: string | number; label: string; needsDetail?: boolean; categoryId: FluidCategoryEnum; }
interface Option<T> { id: T; label: string; }

const LIST_LIMIT = 40;

const labelsToOptions = <T extends number>(labels: Record<T, string>): Option<T>[] =>
  (Object.keys(labels) as string[]).map(Number).filter((n) => !Number.isNaN(n))
    .map((id) => ({ id: id as T, label: labels[id as T] }));

/**
 * Registro e edição de fármaco/bomba, evento e balanço hídrico em painel da
 * Monitorização: escolha por lista com busca (e "recentes do caso" para
 * fármacos), valores no teclado numérico próprio e hora padrão "agora".
 *
 * Carrega os mesmos catálogos (MasterDataService) e devolve exatamente o mesmo
 * payload do antigo ClinicalItemModal via `dismiss(payload, 'save')`, então as
 * regras de gravação no componente pai não mudam.
 */
@Component({
  selector: 'app-item-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, NumericKeypadComponent],
  templateUrl: './item-panel.component.html',
  styleUrls: ['./item-panel.component.scss'],
})
export class ItemPanelComponent implements OnInit {
  @Input() type: ItemPanelType = 'agent';
  @Input() initial: any = null;
  /** Fármacos já lançados neste caso (mais recentes primeiro) para o atalho "Recentes". */
  @Input() recentAgents: Agent[] = [];
  /** Totais do balanço para o resumo no topo. */
  @Input() balanceTotals: { gain: number; loss: number } | null = null;

  step: 'pick' | 'form' = 'pick';
  loading = true;
  search = '';
  time = '';

  medications: Medication[] = [];
  eventTypes: EventTypeOption[] = [];
  gainItems: BalanceItem[] = [];
  readonly lossItems: BalanceItem[] = [
    { id: 'urine', label: 'Diurese', categoryId: FLUID_CATEGORY_KEY_TO_ID['urine'] },
    { id: 'bleeding', label: 'Sangue', categoryId: FLUID_CATEGORY_KEY_TO_ID['bleeding'] },
  ];

  readonly routeOptions = labelsToOptions<AdministrationRouteEnum>(ADMINISTRATION_ROUTE_LABELS)
    .map((o) => ({ ...o, short: o.label.split(' (')[0] }));
  readonly unitOptions = labelsToOptions<MedicationUnitEnum>(MEDICATION_UNIT_LABELS);
  readonly rateUnitOptions = labelsToOptions<InfusionRateUnitEnum>(INFUSION_RATE_UNIT_LABELS);

  agent = {
    medicationId: null as number | string | null,
    medicationName: '',
    mode: 'dose' as AgentMode,
    dose: '',
    unit: MedicationUnitEnum.Milligram,
    routeId: null as AdministrationRouteEnum | null,
    rate: '',
    rateUnit: InfusionRateUnitEnum.MillilitersPerHour,
    volume: '',
  };

  event = { eventTypeId: null as number | null, name: '', description: '' };

  balance = {
    type: 'gain' as 'gain' | 'loss',
    // Mesmo tipo que veio do registro (texto do catálogo ou id numérico vindo da API).
    itemId: null as string | number | null,
    itemLabel: '',
    detail: '',
    volume: '',
  };

  activeNum: NumField = 'dose';

  constructor(private readonly modalController: ModalController, private readonly masterData: MasterDataService) {}

  get isEdit(): boolean {
    return !!this.initial;
  }

  async ngOnInit(): Promise<void> {
    const now = new Date();
    this.time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.activeNum = this.type === 'balance' ? 'balanceVolume' : 'dose';
    try {
      if (this.type !== 'event') await this.loadMedications();
      if (this.type === 'balance') this.gainItems = this.medications.map((m) => ({ id: `aghu_${m.id}`, label: m.description, categoryId: FluidCategoryEnum.Other }));
      if (this.type === 'event') await this.loadEventTypes();
    } finally {
      this.loading = false;
    }
    this.hydrateInitial();
  }

  // ---------------------------------------------------------------------------
  // Catálogos (mesmas regras do antigo ClinicalItemModal)
  // ---------------------------------------------------------------------------

  private asArray(v: any): any[] {
    if (Array.isArray(v)) return v;
    if (v?.data && Array.isArray(v.data)) return v.data;
    if (v?.items && Array.isArray(v.items)) return v.items;
    if (v?.result && Array.isArray(v.result)) return v.result;
    return [];
  }

  private async loadMedications(): Promise<void> {
    try {
      const raw = await this.masterData.getMedicationsCache();
      this.medications = this.asArray(raw)
        .map((m: any) => ({
          id: m.id ?? m.medicationId ?? m.codigo,
          description: m.description ?? m.descricao ?? m.name ?? String(m.id),
          defaultUnit: m.defaultUnit,
        }))
        .filter((m: any) => m.id != null && !!m.description)
        .filter((m: any) => {
          if (this.type !== 'agent' || !m.defaultUnit) return true;
          return ['amp', 'fr', 'fra'].includes(String(m.defaultUnit).toLowerCase());
        })
        .map(({ id, description }: any) => ({ id, description }))
        .sort((a: Medication, b: Medication) => a.description.localeCompare(b.description, 'pt-BR'));
    } catch (e) {
      console.error('[ItemPanel] Falha ao carregar medicações', e);
      this.medications = [];
    }
  }

  private async loadEventTypes(): Promise<void> {
    try {
      const raw = await this.masterData.getEventsCache();
      this.eventTypes = this.asArray(raw)
        .map((e: any) => ({ id: e.id, name: e.name ?? e.nome ?? '', description: e.description ?? e.descricao ?? '', active: e.active !== false }))
        .filter((e: any) => e.id != null && !!e.name && e.active)
        .map(({ id, name, description }: any) => ({ id, name, description }))
        .sort((a: EventTypeOption, b: EventTypeOption) => a.name.localeCompare(b.name, 'pt-BR'));
    } catch (e) {
      console.error('[ItemPanel] Falha ao carregar eventos', e);
      this.eventTypes = [];
    }
  }

  private hydrateInitial(): void {
    if (!this.initial) return;
    this.time = this.initial.time ?? this.time;
    this.step = 'form';
    if (this.type === 'agent') {
      const doseValue = this.initial.doseValue ?? (typeof this.initial.dose === 'number' ? this.initial.dose : null);
      this.agent = {
        ...this.agent,
        medicationId: this.initial.medicationId ?? null,
        medicationName: this.initial.medicationName ?? this.initial.name ?? '',
        mode: this.initial.isBolus ? 'bolus' : 'dose',
        dose: numberToKeypad(doseValue),
        unit: this.initial.unit ?? this.initial.doseUnit ?? MedicationUnitEnum.Milligram,
        routeId: this.initial.routeId ?? (typeof this.initial.route === 'number' ? this.initial.route : null),
      };
    } else if (this.type === 'event') {
      this.event = {
        eventTypeId: this.initial.catalogEventId ?? null,
        name: this.initial.catalogEventName ?? this.initial.categoryLabel ?? '',
        description: this.initial.description ?? this.initial.observations ?? '',
      };
    } else {
      this.balance = {
        type: this.initial.type ?? 'gain',
        itemId: this.initial.itemId ?? null,
        itemLabel: this.initial.itemLabel ?? this.initial.label ?? this.initial.item ?? '',
        detail: this.initial.detail ?? '',
        volume: numberToKeypad(this.initial.volumeMl ?? this.initial.volume ?? null),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Listas
  // ---------------------------------------------------------------------------

  private normalize(s: string): string {
    return (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  get filteredMedications(): Medication[] {
    const q = this.normalize(this.search);
    const list = q ? this.medications.filter((m) => this.normalize(m.description).includes(q)) : this.medications;
    return list.slice(0, LIST_LIMIT);
  }

  get filteredEvents(): EventTypeOption[] {
    const q = this.normalize(this.search);
    return q ? this.eventTypes.filter((e) => this.normalize(e.name).includes(q)) : this.eventTypes;
  }

  get balanceItems(): BalanceItem[] {
    return this.balance.type === 'gain' ? this.gainItems : this.lossItems;
  }

  get filteredBalanceItems(): BalanceItem[] {
    const q = this.normalize(this.search);
    const list = q ? this.balanceItems.filter((i) => this.normalize(i.label).includes(q)) : this.balanceItems;
    return list.slice(0, LIST_LIMIT);
  }

  /** Um atalho por fármaco (o lançamento mais recente de cada um), até 6. */
  get recents(): Agent[] {
    const seen = new Set<string>();
    const out: Agent[] = [];
    for (const a of this.recentAgents) {
      const key = String(a.medicationId ?? a.name);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
      if (out.length === 6) break;
    }
    return out;
  }

  get canUseCustomMedication(): boolean {
    const q = this.search.trim();
    return this.type === 'agent' && !!q && !this.medications.some((m) => this.normalize(m.description) === this.normalize(q));
  }

  // ---------------------------------------------------------------------------
  // Seleções
  // ---------------------------------------------------------------------------

  pickMedication(m: Medication): void {
    this.agent.medicationId = m.id;
    this.agent.medicationName = m.description;
    this.goForm('dose');
  }

  pickCustomMedication(): void {
    const name = this.search.trim();
    if (!name) return;
    const m: Medication = { id: `custom-${Date.now()}`, description: name };
    this.medications.push(m);
    this.pickMedication(m);
  }

  /** Recente: repete fármaco, dose, unidade e via do último lançamento — só falta confirmar. */
  pickRecent(a: Agent): void {
    this.agent = {
      ...this.agent,
      medicationId: a.medicationId ?? `custom-${Date.now()}`,
      medicationName: a.name,
      mode: a.isBolus ? 'bolus' : 'dose',
      dose: numberToKeypad(a.doseValue ?? null),
      unit: a.unit ?? MedicationUnitEnum.Milligram,
      routeId: a.routeId ?? null,
    };
    this.goForm('dose');
  }

  pickEvent(e: EventTypeOption): void {
    this.event = { eventTypeId: e.id, name: e.name, description: e.description ?? '' };
    this.goForm(null);
  }

  pickBalanceItem(i: BalanceItem): void {
    this.balance.itemId = i.id;
    this.balance.itemLabel = i.label;
    if (!i.needsDetail) this.balance.detail = '';
    this.goForm('balanceVolume');
  }

  setBalanceType(t: 'gain' | 'loss'): void {
    if (this.balance.type === t) return;
    this.balance = { ...this.balance, type: t, itemId: null, itemLabel: '', detail: '' };
    this.search = '';
    this.step = 'pick';
  }

  setAgentMode(mode: AgentMode): void {
    this.agent.mode = mode;
    this.activeNum = mode === 'pump' ? 'rate' : 'dose';
  }

  backToPick(): void {
    this.step = 'pick';
    this.search = '';
  }

  private goForm(num: NumField | null): void {
    this.step = 'form';
    this.search = '';
    if (num) this.activeNum = num;
  }

  get needsDetail(): boolean {
    return !!this.balanceItems.find((i) => i.id === this.balance.itemId)?.needsDetail;
  }

  // ---------------------------------------------------------------------------
  // Teclado
  // ---------------------------------------------------------------------------

  get keypadValue(): string {
    switch (this.activeNum) {
      case 'rate': return this.agent.rate;
      case 'volume': return this.agent.volume;
      case 'balanceVolume': return this.balance.volume;
      default: return this.agent.dose;
    }
  }

  onKeypad(v: string): void {
    switch (this.activeNum) {
      case 'rate': this.agent.rate = v; break;
      case 'volume': this.agent.volume = v; break;
      case 'balanceVolume': this.balance.volume = v; break;
      default: this.agent.dose = v;
    }
  }

  get showKeypad(): boolean {
    return this.step === 'form' && this.type !== 'event';
  }

  // ---------------------------------------------------------------------------
  // Salvar (mesmo payload do antigo ClinicalItemModal)
  // ---------------------------------------------------------------------------

  private positive(text: string): boolean {
    const n = keypadToNumber(text);
    return n != null && n > 0;
  }

  get canSave(): boolean {
    if (this.step !== 'form') return false;
    if (this.type === 'agent') {
      if (!this.agent.medicationId) return false;
      if (this.agent.mode === 'pump') return this.positive(this.agent.rate) && this.positive(this.agent.volume);
      return this.positive(this.agent.dose) && !!this.agent.routeId;
    }
    if (this.type === 'event') return !!this.event.eventTypeId && !!this.event.description?.trim();
    return !!this.balance.itemId && this.positive(this.balance.volume) && (!this.needsDetail || !!this.balance.detail?.trim());
  }

  get missingHint(): string | null {
    if (this.step !== 'form' || this.canSave) return null;
    if (this.type === 'agent' && this.agent.mode !== 'pump') {
      if (!this.positive(this.agent.dose)) return 'monitorizacao.shell.panels.missingDose';
      if (!this.agent.routeId) return 'monitorizacao.shell.panels.missingRoute';
    }
    if (this.type === 'agent') return 'monitorizacao.shell.panels.missingPump';
    if (this.type === 'event') return 'monitorizacao.shell.panels.missingDescription';
    return 'monitorizacao.shell.panels.missingVolume';
  }

  save(): void {
    if (!this.canSave) return;
    const time = this.time || null;
    let payload: any;
    if (this.type === 'agent' && this.agent.mode === 'pump') {
      payload = {
        type: 'infusionPump',
        medicationId: this.agent.medicationId,
        medicationName: this.agent.medicationName,
        rate: keypadToNumber(this.agent.rate),
        rateUnit: this.agent.rateUnit,
        volumeMl: keypadToNumber(this.agent.volume),
        time,
      };
    } else if (this.type === 'agent') {
      const doseValue = keypadToNumber(this.agent.dose)!;
      const route = this.routeOptions.find((r) => r.id === this.agent.routeId);
      payload = {
        type: 'agent',
        medicationId: this.agent.medicationId,
        medicationName: this.agent.medicationName,
        name: this.agent.medicationName,
        dose: `${doseValue}${MEDICATION_UNIT_LABELS[this.agent.unit]}`,
        doseValue,
        unit: this.agent.unit,
        routeId: this.agent.routeId,
        route: route?.label ?? null,
        isBolus: this.agent.mode === 'bolus',
        time,
      };
    } else if (this.type === 'event') {
      payload = {
        type: 'event',
        catalogEventId: this.event.eventTypeId,
        catalogEventName: this.event.name,
        categoryLabel: this.event.name,
        eventTypeId: ClinicalEventTypeEnum.Other,
        description: this.event.description.trim(),
        time,
      };
    } else {
      const item = this.balanceItems.find((i) => i.id === this.balance.itemId);
      payload = {
        type: 'balance',
        balanceType: this.balance.type,
        itemId: this.balance.itemId,
        itemLabel: this.balance.itemLabel,
        label: this.balance.itemLabel,
        detail: this.balance.detail?.trim() || null,
        volumeMl: keypadToNumber(this.balance.volume),
        categoryId: item?.categoryId ?? FluidCategoryEnum.Other,
        balanceTypeId: this.balance.type === 'gain' ? FluidBalanceTypeEnum.Gain : FluidBalanceTypeEnum.Loss,
        time,
      };
    }
    void this.modalController.dismiss(payload, 'save');
  }

  remove(): void {
    void this.modalController.dismiss(null, 'delete');
  }

  cancel(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  setNow(): void {
    const d = new Date();
    this.time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  get titleKey(): string {
    const mode = this.isEdit ? 'Edit' : 'New';
    return `monitorizacao.shell.panels.${this.type}${mode}Title`;
  }

  get unitLabel(): string {
    return MEDICATION_UNIT_LABELS[this.agent.unit];
  }

  get rateUnitLabel(): string {
    return INFUSION_RATE_UNIT_LABELS[this.agent.rateUnit];
  }
}
