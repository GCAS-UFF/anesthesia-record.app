import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonSpinner, ModalController } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  chevronDownOutline, closeOutline, cloudOfflineOutline, lockClosedOutline, flaskOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';

import {
  ConsumptionSummary, ConsumptionSummaryState, DrugAdministration, DrugGroup, FluidGroup, UnitTotal,
} from 'src/app/core/models/consumption-summary.model';
import { ConsumptionSummaryService } from 'src/app/core/services/consumption-summary.service';

export type ConsumptionTab = 'drugs' | 'fluids' | 'pumps' | 'gases' | 'timeline';

/**
 * Resumo de insumos/consumo da cirurgia (somente leitura). Abrir ou manter aberto nunca grava
 * nada: só lê o servidor e o rascunho local via ConsumptionSummaryService.
 */
@Component({
  selector: 'app-consumption-summary-modal',
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner, TranslatePipe],
  templateUrl: './consumption-summary-modal.component.html',
  styleUrls: ['./consumption-summary-modal.component.scss'],
})
export class ConsumptionSummaryModalComponent implements OnInit, OnDestroy {
  @Input() surgeryId!: number;
  @Input() patientName = '';
  @Input() procedure = '';
  @Input() record = '';

  state: ConsumptionSummaryState = { summary: null, loading: true, error: null, serverSyncedAt: null };
  activeTab: ConsumptionTab = 'drugs';
  private readonly expanded = new Set<string>();
  private sub?: Subscription;

  readonly tabs: ConsumptionTab[] = ['drugs', 'fluids', 'pumps', 'gases', 'timeline'];

  constructor(
    private modalController: ModalController,
    private consumptionService: ConsumptionSummaryService,
    private translate: TranslateService,
  ) {
    addIcons({ closeOutline, chevronDownOutline, cloudOfflineOutline, lockClosedOutline, flaskOutline });
  }

  get summary(): ConsumptionSummary | null {
    return this.state.summary;
  }

  ngOnInit(): void {
    this.sub = this.consumptionService.watch(Number(this.surgeryId)).subscribe(state => (this.state = state));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  close(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  setTab(tab: ConsumptionTab): void {
    this.activeTab = tab;
  }

  tabCount(tab: ConsumptionTab): number {
    const s = this.summary;
    if (!s) return 0;
    switch (tab) {
      case 'drugs': return s.agents.length + s.medications.length;
      case 'fluids': return s.fluids.entryCount + s.solutions.length;
      case 'pumps': return s.pumps.length;
      case 'gases': return s.gases.o2.intervals.length + s.gases.air.intervals.length;
      case 'timeline': return s.events.length;
    }
  }

  isExpanded(key: string): boolean {
    return this.expanded.has(key);
  }

  toggle(key: string): void {
    if (this.expanded.has(key)) this.expanded.delete(key);
    else this.expanded.add(key);
  }

  // -------------------------------------------------------------------------
  // Formatação (valor ausente → texto "Não registrado", nunca zero)
  // -------------------------------------------------------------------------

  private get locale(): string {
    return this.translate.getCurrentLang() || 'pt-BR';
  }

  num(value: number | null | undefined, digits = 1): string {
    if (value == null) return this.notRegistered;
    return new Intl.NumberFormat(this.locale, { maximumFractionDigits: digits }).format(value);
  }

  signedMl(value: number): string {
    const formatted = this.num(Math.abs(value));
    return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatted} mL`;
  }

  totals(totals: UnitTotal[]): string {
    return totals.map(t => `${this.num(t.total, 3)} ${t.unit}`.trim()).join(' + ');
  }

  duration(minutes: number | null | undefined): string {
    if (minutes == null) return this.notRegistered;
    const total = Math.round(minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m} min`;
    return `${h} h ${String(m).padStart(2, '0')} min`;
  }

  time(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '—';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  get notRegistered(): string {
    return this.translate.instant('sharedComponents.consumptionSummary.notRegistered');
  }

  administrationKind(a: DrugAdministration): string {
    const key = a.origin === 'monitoring' ? (a.isBolus ? 'bolus' : 'dose') : a.origin;
    return this.translate.instant(`sharedComponents.consumptionSummary.origin.${key}`);
  }

  fluidTypeLabel(group: FluidGroup): string {
    const key = group.isHydration ? 'hydration' : String(group.categoryId ?? 8);
    return this.translate.instant(`sharedComponents.consumptionSummary.fluidTypes.${key}`);
  }

  fluidItemLabel(group: FluidGroup): string {
    return group.isHydration ? this.fluidTypeLabel(group) : group.label || this.fluidTypeLabel(group);
  }

  drugMeta(g: DrugGroup): string {
    const parts = [
      this.translate.instant('sharedComponents.consumptionSummary.drugs.administrations', { count: g.administrations.length }),
    ];
    if (g.routes.length) parts.push(g.routes.join(', '));
    if (g.firstTime) parts.push(g.firstTime === g.lastTime ? g.firstTime : `${g.firstTime} → ${g.lastTime}`);
    return parts.join(' · ');
  }

  trackByKey(_: number, item: { key: string }): string {
    return item.key;
  }
}
