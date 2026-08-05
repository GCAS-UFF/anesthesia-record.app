import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from 'src/app/core/services/master-data.service';
import { ModalController, IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, searchOutline, closeCircle, checkmarkOutline, chevronDownOutline } from 'ionicons/icons';

type ItemType = 'agent' | 'event' | 'balance';

interface Medication { id: number | string; description: string; }
interface EventCategory { id: string; label: string; emoji: string; }
interface BalanceItem { id: string; label: string; needsDetail?: boolean; }

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
    dose: string;
    route: string | null;
  } = { medicationId: null, medicationName: '', dose: '', route: null };

  medications: Medication[] = [];
  medSearchTerm = '';
  medSuggestions: Medication[] = [];
  medDropdownOpen = false;
  medHighlightIndex = -1;
  routeOptions = ['EV', 'IM', 'SC', 'VO', 'SL', 'Inalatória', 'Tópica', 'Retal', 'Peridural', 'Raquidiana'];

  event: { categoryId: string | null; categoryLabel: string; description: string } = {
    categoryId: null, categoryLabel: '', description: '',
  };
  eventCategories: EventCategory[] = [
    { id: 'intubation',    label: 'Intubação',     emoji: '🫁' },
    { id: 'extubation',    label: 'Extubação',     emoji: '🫁' },
    { id: 'incision',      label: 'Incisão',       emoji: '🔪' },
    { id: 'block',         label: 'Bloqueio',      emoji: '💉' },
    { id: 'tourniquet_on', label: 'Garrote ON',    emoji: '🛑' },
    { id: 'tourniquet_off',label: 'Garrote OFF',   emoji: '✅' },
    { id: 'position',      label: 'Posição',       emoji: '🔄' },
    { id: 'complication',  label: 'Complicação',   emoji: '⚠️' },
    { id: 'other',         label: 'Outro',         emoji: '📝' },
  ];

  balance: {
    type: 'gain' | 'loss';
    itemId: string | null;
    itemLabel: string;
    detail: string;
    volumeMl: number | null;
  } = { type: 'gain', itemId: null, itemLabel: '', detail: '', volumeMl: null };

  gainItems: BalanceItem[] = [
    { id: 'crystalloid',    label: 'Cristaloide (SF/RL)' },
    { id: 'colloid',        label: 'Coloide' },
    { id: 'blood',          label: 'Hemocomponente' },
    { id: 'albumin',        label: 'Albumina' },
    { id: 'other_gain',     label: 'Outro', needsDetail: true },
  ];

  lossItems: BalanceItem[] = [
    { id: 'bleeding',       label: 'Sangramento' },
    { id: 'urine',          label: 'Diurese' },
    { id: 'aspirate',       label: 'Aspirado gástrico' },
    { id: 'insensible',     label: 'Perda insensível' },
    { id: 'other_loss',     label: 'Outro', needsDetail: true },
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
        dose: this.initial.dose ?? '',
        route: this.initial.route ?? null,
      };
      this.medSearchTerm = this.agent.medicationName || '';
    } else if (this.type === 'event') {
      this.event = {
        categoryId: this.initial.categoryId ?? this.initial.category ?? null,
        categoryLabel: this.initial.categoryLabel ?? '',
        description: this.initial.description ?? '',
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
    return (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
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

  /** Compat: mantém a assinatura antiga chamada no HTML antigo (ion-select). */
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
      return !!this.agent.medicationId && !!this.agent.dose?.trim();
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
      payload = {
        type: 'agent',
        medicationId: this.agent.medicationId,
        medicationName: this.agent.medicationName,
        name: this.agent.medicationName,
        dose: this.agent.dose.trim(),
        route: this.agent.route,
        timestamp: new Date().toISOString(),
      };
    } else if (this.type === 'event') {
      payload = {
        type: 'event',
        category: this.event.categoryId,
        categoryId: this.event.categoryId,
        categoryLabel: this.event.categoryLabel,
        description: this.event.description.trim(),
        timestamp: new Date().toISOString(),
      };
    } else {
      payload = {
        type: 'balance',
        balanceType: this.balance.type,
        itemId: this.balance.itemId,
        itemLabel: this.balance.itemLabel,
        label: this.balance.itemLabel,
        detail: this.balance.detail?.trim() || null,
        volumeMl: Number(this.balance.volumeMl),
        timestamp: new Date().toISOString(),
      };
    }

    this.modalCtrl.dismiss(payload, 'save');
  }
}
