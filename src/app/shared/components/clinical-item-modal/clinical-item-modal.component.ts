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
  CLINICAL_EVENT_TYPE_KEY_TO_ID,
  FluidCategoryEnum,
  FLUID_CATEGORY_KEY_TO_ID,
  FluidBalanceTypeEnum,
} from 'src/app/core/models/api-enums.model';

type ItemType = 'agent' | 'event' | 'balance';

interface Medication { id: number | string; description: string; }
interface EventCategory { id: string; label: string; emoji: string; enumId: ClinicalEventTypeEnum; }
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

  event: { categoryId: string | null; categoryLabel: string; description: string } = {
    categoryId: null, categoryLabel: '', description: '',
  };


  eventCategories: EventCategory[] = [
    { id: 'intubation',     label: 'Intubação',   emoji: '🫁', enumId: CLINICAL_EVENT_TYPE_KEY_TO_ID['intubation'] },
    { id: 'extubation',     label: 'Extubação',   emoji: '🫁', enumId: CLINICAL_EVENT_TYPE_KEY_TO_ID['extubation'] },
    { id: 'incision',       label: 'Incisão',     emoji: '🔪', enumId: CLINICAL_EVENT_TYPE_KEY_TO_ID['incision'] },
    { id: 'block',          label: 'Bloqueio',    emoji: '💉', enumId: CLINICAL_EVENT_TYPE_KEY_TO_ID['block'] },
    { id: 'tourniquet_on',  label: 'Garrote ON',  emoji: '🛑', enumId: CLINICAL_EVENT_TYPE_KEY_TO_ID['tourniquet_on'] },
    { id: 'tourniquet_off', label: 'Garrote OFF', emoji: '✅', enumId: CLINICAL_EVENT_TYPE_KEY_TO_ID['tourniquet_off'] },
    { id: 'position',       label: 'Posição',     emoji: '🔄', enumId: CLINICAL_EVENT_TYPE_KEY_TO_ID['position'] },
    { id: 'complication',   label: 'Complicação', emoji: '⚠️', enumId: CLINICAL_EVENT_TYPE_KEY_TO_ID['complication'] },
    { id: 'other',          label: 'Outro',       emoji: '📝', enumId: CLINICAL_EVENT_TYPE_KEY_TO_ID['other'] },
  ];

  balance: {
    type: 'gain' | 'loss';
    itemId: string | null;
    itemLabel: string;
    detail: string;
    volumeMl: number | null;
  } = { type: 'gain', itemId: null, itemLabel: '', detail: '', volumeMl: null };

  gainItems: BalanceItem[] = [
    { id: 'crystalloid', label: 'Cristaloide (SF/RL)', categoryId: FLUID_CATEGORY_KEY_TO_ID['crystalloid'] },
    { id: 'colloid',     label: 'Coloide',              categoryId: FLUID_CATEGORY_KEY_TO_ID['colloid'] },
    { id: 'blood',       label: 'Hemocomponente',       categoryId: FLUID_CATEGORY_KEY_TO_ID['blood'] },
    { id: 'albumin',     label: 'Albumina',              categoryId: FLUID_CATEGORY_KEY_TO_ID['albumin'] },
    { id: 'other_gain',  label: 'Outro', needsDetail: true, categoryId: FLUID_CATEGORY_KEY_TO_ID['other_gain'] },
  ];

  lossItems: BalanceItem[] = [
    { id: 'bleeding',    label: 'Sangramento',       categoryId: FLUID_CATEGORY_KEY_TO_ID['bleeding'] },
    { id: 'urine',       label: 'Diurese',            categoryId: FLUID_CATEGORY_KEY_TO_ID['urine'] },
    { id: 'drain',       label: 'Dreno',              categoryId: FLUID_CATEGORY_KEY_TO_ID['drain'] },
    { id: 'aspirate',    label: 'Aspirado gástrico',  categoryId: FLUID_CATEGORY_KEY_TO_ID['aspirate'] },
    { id: 'insensible',  label: 'Perda insensível',   categoryId: FLUID_CATEGORY_KEY_TO_ID['insensible'] },
    { id: 'other_loss',  label: 'Outro', needsDetail: true, categoryId: FLUID_CATEGORY_KEY_TO_ID['other_loss'] },
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
        categoryId: this.initial.categoryId ?? this.initial.category ?? null,
        categoryLabel: this.initial.categoryLabel ?? '',
        description: this.initial.description ?? this.initial.observations ?? '',
      };
    } else if (this.type === 'balance') {
      this.balance = {
        type: this.initial.type ?? 'gain',
        itemId: this.initial.itemId ?? null,
        itemLabel: this.initial.itemLabel ?? this.initial.label ?? '',
        detail: this.initial.detail ?? '',
        volumeMl: this.initial.volumeMl ?? this.initial.volume ?? null,
      };
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


  onEventCategoryChange(id: string) {
    const c = this.eventCategories.find(x => x.id === id);
    this.event.categoryId = id;
    this.event.categoryLabel = c?.label ?? '';
  }


  onBalanceTypeChange(t: 'gain' | 'loss') {
    this.balance.type = t;
    this.balance.itemId = null;
    this.balance.itemLabel = '';
    this.balance.detail = '';
  }

  onBalanceItemChange(id: string) {
    const item = this.balanceItems.find(i => i.id === id);
    this.balance.itemId = id;
    this.balance.itemLabel = item?.label ?? '';
    if (!item?.needsDetail) this.balance.detail = '';
  }


  get canSave(): boolean {
    if (this.type === 'agent') {
      return !!this.agent.medicationId && this.agent.doseValue != null && Number(this.agent.doseValue) > 0 && !!this.agent.routeId;
    }
    if (this.type === 'event') {
      return !!this.event.categoryId && !!this.event.description?.trim();
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
      const category = this.eventCategories.find(c => c.id === this.event.categoryId);
      payload = {
        type: 'event',
        category: this.event.categoryId,
        categoryId: this.event.categoryId,
        categoryLabel: this.event.categoryLabel,        
        eventTypeId: category?.enumId ?? CLINICAL_EVENT_TYPE_KEY_TO_ID['other'],
        description: this.event.description.trim(),
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
