import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from 'src/app/core/services/master-data.service';
import { ModalController, IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, searchOutline, closeCircle, checkmarkOutline, chevronDownOutline } from 'ionicons/icons';
import {
  MedicationUnitEnum,
  MEDICATION_UNIT_LABELS,
  AdministrationRouteEnum,
  ADMINISTRATION_ROUTE_LABELS,
  ClinicalEventTypeEnum,
  FluidCategoryEnum,
  FLUID_CATEGORY_KEY_TO_ID,
  FluidBalanceTypeEnum,
} from 'src/app/core/models/api-enums.model';

type ItemType = 'agent' | 'event' | 'balance';

interface Medication { id: number | string; description: string; }
interface EventTypeOption { id: number; name: string; description: string; }
interface RouteOption { id: AdministrationRouteEnum; label: string; }
interface UnitOption { id: MedicationUnitEnum; label: string; }
interface BalanceItem { id: string; label: string; needsDetail?: boolean; categoryId: FluidCategoryEnum; }

@Component({
  selector: 'app-clinical-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './clinical-item-modal.component.html',
  styleUrls: ['./clinical-item-modal.component.scss'],
})
export class ClinicalItemModalComponent implements OnInit {
  @Input() type: ItemType = 'agent';
  @Input() initial: any = null;

  agent: {
    medicationId: number | string | null;
    medicationName: string;
    doseValue: number | null;
    doseUnit: MedicationUnitEnum;
    routeId: AdministrationRouteEnum | null;
  } = { medicationId: null, medicationName: '', doseValue: null, doseUnit: MedicationUnitEnum.Milligram, routeId: null };

  medications: Medication[] = [];
  medSearchTerm = '';
  medSuggestions: Medication[] = [];
  medDropdownOpen = false;
  medHighlightIndex = -1;

  /** Vias de administração — IDs casam 1:1 com `AdministrationRouteEnum` do backend. */
  readonly routeOptions: RouteOption[] = (Object.keys(ADMINISTRATION_ROUTE_LABELS) as any[])
    .map((key) => Number(key))
    .filter((id) => !Number.isNaN(id))
    .map((id) => ({ id, label: ADMINISTRATION_ROUTE_LABELS[id as AdministrationRouteEnum] }));

  /** Unidades de dose — IDs casam 1:1 com `MedicationUnitEnum` do backend. */
  readonly unitOptions: UnitOption[] = (Object.keys(MEDICATION_UNIT_LABELS) as any[])
    .map((key) => Number(key))
    .filter((id) => !Number.isNaN(id))
    .map((id) => ({ id, label: MEDICATION_UNIT_LABELS[id as MedicationUnitEnum] }));

  event: { eventTypeId: number | null; name: string; description: string; time: string } = {
    eventTypeId: null, name: '', description: '', time: '',
  };

  get isEditMode(): boolean {
    return !!this.initial;
  }

  eventTypes: EventTypeOption[] = [];
  eventSearchTerm = '';

  get filteredEventTypes(): EventTypeOption[] {
    const q = this.normalize(this.eventSearchTerm);
    if (!q) return this.eventTypes;
    return this.eventTypes.filter(e => this.normalize(e.name).includes(q));
  }

  balance: {
    type: 'gain' | 'loss';
    itemId: string | null;
    itemLabel: string;
    detail: string;
    volumeMl: number | null;
  } = { type: 'gain', itemId: null, itemLabel: '', detail: '', volumeMl: null };

  balanceSearchTerm = '';
  balanceSuggestions: BalanceItem[] = [];
  balanceDropdownOpen = false;
  balanceHighlightIndex = -1;

  // Ganho: preenchido dinamicamente a partir do cache de medicamentos do AGHU (ver loadMedications/buildGainItemsFromMedications) — mesma fonte já usada pelo tipo "agent".
  gainItems: BalanceItem[] = [];

  lossItems: BalanceItem[] = [
    { id: 'urine', label: 'Diurese', categoryId: FLUID_CATEGORY_KEY_TO_ID['urine'] },
    { id: 'bleeding', label: 'Sangue', categoryId: FLUID_CATEGORY_KEY_TO_ID['bleeding'] },
  ];

  get balanceItems(): BalanceItem[] {
    return this.balance.type === 'gain' ? this.gainItems : this.lossItems;
  }

  get needsDetail(): boolean {
    const found = this.balanceItems.find(i => i.id === this.balance.itemId);
    return !!found?.needsDetail;
  }

  constructor(
    private modalCtrl: ModalController,
    private masterData: MasterDataService,
  ) {
    addIcons({ closeOutline, searchOutline, closeCircle, checkmarkOutline, chevronDownOutline });
  }

  async ngOnInit() {
    await this.loadMedications();
    this.buildGainItemsFromMedications();
    await this.loadEventTypes();
    this.hydrateInitial();
  }


  private asArray(v: any): any[] {
    if (Array.isArray(v)) return v;
    if (v?.data && Array.isArray(v.data)) return v.data;
    if (v?.items && Array.isArray(v.items)) return v.items;
    if (v?.result && Array.isArray(v.result)) return v.result;
    return [];
  }

  private async loadMedications() {
    try {
      const raw = await this.masterData.getMedicationsCache();
      this.medications = this.asArray(raw)
        .map((m: any) => ({
          id: m.id ?? m.medicationId ?? m.codigo,
          description: m.description ?? m.descricao ?? m.name ?? String(m.id),
        }))
        .filter(m => m.id != null && !!m.description)
        .sort((a, b) => a.description.localeCompare(b.description, 'pt-BR'));
    } catch (e) {
      console.error('[ClinicalItemModal] Falha ao carregar medicações', e);
      this.medications = [];
    }
  }

  /**
   * Ganho do Balanço = medicamentos provenientes do AGHU, reaproveitando o mesmo
   * cache/serviço já usado para o campo "Medicação" da tela de Agentes (MasterDataService.getMedicationsCache()).
   * O backend (FluidCategoryEnum) ainda não tem uma categoria dedicada para "medicamento",
   * então usamos FluidCategoryEnum.Other — o nome específico do medicamento continua
   * preservado no itemLabel/description do lançamento.
   */
  private buildGainItemsFromMedications() {
    this.gainItems = this.medications.map((m) => ({
      id: `aghu_${m.id}`,
      label: m.description,
      categoryId: FluidCategoryEnum.Other,
    }));
  }

  private async loadEventTypes() {
    try {
      const raw = await this.masterData.getEventsCache();
      this.eventTypes = this.asArray(raw)
        .map((e: any) => ({
          id: e.id,
          name: e.name ?? e.nome ?? '',
          description: e.description ?? e.descricao ?? '',
          active: e.active !== false,
        }))
        .filter((e: any) => e.id != null && !!e.name && e.active)
        .map(({ id, name, description }) => ({ id, name, description }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    } catch (e) {
      console.error('[ClinicalItemModal] Falha ao carregar eventos', e);
      this.eventTypes = [];
    }
  }

  private hydrateInitial() {
    if (!this.initial) return;
    if (this.type === 'agent') {
      this.agent = {
        medicationId: this.initial.medicationId ?? null,
        medicationName: this.initial.medicationName ?? this.initial.name ?? '',
        doseValue: this.initial.doseValue ?? (typeof this.initial.dose === 'number' ? this.initial.dose : null),
        doseUnit: this.initial.unit ?? this.initial.doseUnit ?? MedicationUnitEnum.Milligram,
        routeId: this.initial.routeId ?? (typeof this.initial.route === 'number' ? this.initial.route : null),
      };
      this.medSearchTerm = this.agent.medicationName || '';
    } else if (this.type === 'event') {
      this.event = {
        eventTypeId: this.initial.catalogEventId ?? null,
        name: this.initial.catalogEventName ?? this.initial.categoryLabel ?? '',
        description: this.initial.description ?? this.initial.observations ?? '',
        time: this.initial.time ?? '',
      };
    } else if (this.type === 'balance') {
      this.balance = {
        type: this.initial.type ?? 'gain',
        itemId: this.initial.itemId ?? null,
        itemLabel: this.initial.itemLabel ?? this.initial.label ?? '',
        detail: this.initial.detail ?? '',
        volumeMl: this.initial.volumeMl ?? this.initial.volume ?? null,
      };
      this.balanceSearchTerm = this.balance.itemLabel || '';
    }
  }


  private normalize(s: string): string {
    return (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  onMedSearchInput(term: string) {
    this.medSearchTerm = term ?? '';
    const q = this.normalize(this.medSearchTerm);
    if (!q) {
      this.medSuggestions = this.medications.slice(0, 30);
    } else {
      this.medSuggestions = this.medications
        .filter(m => this.normalize(m.description).includes(q))
        .slice(0, 30);
    }
    this.medDropdownOpen = true;
    this.medHighlightIndex = this.medSuggestions.length ? 0 : -1;

    if (this.agent.medicationName && this.medSearchTerm !== this.agent.medicationName) {
      this.agent.medicationId = null;
      this.agent.medicationName = '';
    }
  }

  onMedFocus() {
    this.medSuggestions = this.medSearchTerm
      ? this.medications.filter(m => this.normalize(m.description).includes(this.normalize(this.medSearchTerm))).slice(0, 30)
      : this.medications.slice(0, 30);
    this.medDropdownOpen = true;
  }

  onMedBlur() {
    setTimeout(() => (this.medDropdownOpen = false), 150);
  }

  onMedKeydown(ev: KeyboardEvent) {
    if (!this.medDropdownOpen || !this.medSuggestions.length) return;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.medHighlightIndex = (this.medHighlightIndex + 1) % this.medSuggestions.length;
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.medHighlightIndex = (this.medHighlightIndex - 1 + this.medSuggestions.length) % this.medSuggestions.length;
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const pick = this.medSuggestions[this.medHighlightIndex] ?? this.medSuggestions[0];
      if (pick) this.selectMedication(pick);
    } else if (ev.key === 'Escape') {
      this.medDropdownOpen = false;
    }
  }

  selectMedication(m: Medication) {
    this.agent.medicationId = m.id;
    this.agent.medicationName = m.description;
    this.medSearchTerm = m.description;
    this.medDropdownOpen = false;
  }

  clearMedication() {
    this.agent.medicationId = null;
    this.agent.medicationName = '';
    this.medSearchTerm = '';
    this.medSuggestions = this.medications.slice(0, 30);
    this.medDropdownOpen = true;
  }


  onMedicationChange(id: number | string) {
    const m = this.medications.find(x => x.id === id);
    if (m) this.selectMedication(m);
  }


  onEventSearchInput(term: string) {
    this.eventSearchTerm = term ?? '';
  }

  selectEventType(e: EventTypeOption) {
    this.event.eventTypeId = e.id;
    this.event.name = e.name;
    this.event.description = e.description ?? '';
  }


  onBalanceTypeChange(t: 'gain' | 'loss') {
    this.balance.type = t;
    this.balance.itemId = null;
    this.balance.itemLabel = '';
    this.balance.detail = '';
    this.balanceSearchTerm = '';
    this.balanceSuggestions = this.balanceItems.slice(0, 30);
    this.balanceDropdownOpen = false;
  }

  onBalanceItemChange(id: string) {
    const item = this.balanceItems.find(i => i.id === id);
    this.balance.itemId = id;
    this.balance.itemLabel = item?.label ?? '';
    if (!item?.needsDetail) this.balance.detail = '';
  }

  onBalanceSearchInput(term: string) {
    this.balanceSearchTerm = term ?? '';
    const q = this.normalize(this.balanceSearchTerm);
    this.balanceSuggestions = q
      ? this.balanceItems.filter(i => this.normalize(i.label).includes(q)).slice(0, 30)
      : this.balanceItems.slice(0, 30);
    this.balanceDropdownOpen = true;
    this.balanceHighlightIndex = this.balanceSuggestions.length ? 0 : -1;

    if (this.balance.itemLabel && this.balanceSearchTerm !== this.balance.itemLabel) {
      this.balance.itemId = null;
      this.balance.itemLabel = '';
      this.balance.detail = '';
    }
  }

  onBalanceFocus() {
    this.balanceSuggestions = this.balanceSearchTerm
      ? this.balanceItems.filter(i => this.normalize(i.label).includes(this.normalize(this.balanceSearchTerm))).slice(0, 30)
      : this.balanceItems.slice(0, 30);
    this.balanceDropdownOpen = true;
  }

  onBalanceBlur() {
    setTimeout(() => (this.balanceDropdownOpen = false), 150);
  }

  onBalanceKeydown(ev: KeyboardEvent) {
    if (!this.balanceDropdownOpen || !this.balanceSuggestions.length) return;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.balanceHighlightIndex = (this.balanceHighlightIndex + 1) % this.balanceSuggestions.length;
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.balanceHighlightIndex = (this.balanceHighlightIndex - 1 + this.balanceSuggestions.length) % this.balanceSuggestions.length;
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const pick = this.balanceSuggestions[this.balanceHighlightIndex] ?? this.balanceSuggestions[0];
      if (pick) this.selectBalanceItem(pick);
    } else if (ev.key === 'Escape') {
      this.balanceDropdownOpen = false;
    }
  }

  selectBalanceItem(item: BalanceItem) {
    this.onBalanceItemChange(item.id);
    this.balanceSearchTerm = item.label;
    this.balanceDropdownOpen = false;
  }

  clearBalanceItem() {
    this.balance.itemId = null;
    this.balance.itemLabel = '';
    this.balance.detail = '';
    this.balanceSearchTerm = '';
    this.balanceSuggestions = this.balanceItems.slice(0, 30);
    this.balanceDropdownOpen = true;
  }


  get canSave(): boolean {
    if (this.type === 'agent') {
      return !!this.agent.medicationId && this.agent.doseValue != null && Number(this.agent.doseValue) > 0 && !!this.agent.routeId;
    }
    if (this.type === 'event') {
      return !!this.event.eventTypeId && !!this.event.description?.trim();
    }
    if (this.type === 'balance') {
      const okItem = !!this.balance.itemId;
      const okVol = this.balance.volumeMl != null && Number(this.balance.volumeMl) > 0;
      const okDetail = !this.needsDetail || !!this.balance.detail?.trim();
      return okItem && okVol && okDetail;
    }
    return false;
  }


  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  save() {
    if (!this.canSave) return;
    let payload: any;

    if (this.type === 'agent') {
      const unitLabel = MEDICATION_UNIT_LABELS[this.agent.doseUnit];
      const routeOption = this.routeOptions.find(r => r.id === this.agent.routeId);
      payload = {
        type: 'agent',
        medicationId: this.agent.medicationId,
        medicationName: this.agent.medicationName,
        name: this.agent.medicationName,
        dose: `${this.agent.doseValue}${unitLabel}`,
        doseValue: Number(this.agent.doseValue),
        unit: this.agent.doseUnit,
        routeId: this.agent.routeId,
        route: routeOption?.label ?? null,
        timestamp: new Date().toISOString(),
      };
    } else if (this.type === 'event') {
      payload = {
        type: 'event',
        catalogEventId: this.event.eventTypeId,
        catalogEventName: this.event.name,
        categoryLabel: this.event.name,
        eventTypeId: ClinicalEventTypeEnum.Other,
        description: this.event.description.trim(),
        time: this.isEditMode ? (this.event.time || null) : null,
        timestamp: new Date().toISOString(),
      };
    } else {
      const item = this.balanceItems.find(i => i.id === this.balance.itemId);
      payload = {
        type: 'balance',
        balanceType: this.balance.type,
        itemId: this.balance.itemId,
        itemLabel: this.balance.itemLabel,
        label: this.balance.itemLabel,
        detail: this.balance.detail?.trim() || null,
        volumeMl: Number(this.balance.volumeMl),
        categoryId: item?.categoryId ?? FluidCategoryEnum.Other,
        balanceTypeId: this.balance.type === 'gain' ? FluidBalanceTypeEnum.Gain : FluidBalanceTypeEnum.Loss,
        timestamp: new Date().toISOString(),
      };
    }

    this.modalCtrl.dismiss(payload, 'save');
  }
}
