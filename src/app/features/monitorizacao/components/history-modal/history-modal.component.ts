import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import {
  Agent, ClinicalEvent, FluidBalance, HistoryTab, VitalRecord,
} from '../../models/monitoring-view.model';

export type HistoryAction =
  | { action: 'edit' | 'delete'; type: 'vital'; item: VitalRecord }
  | { action: 'edit' | 'delete'; type: 'agent'; item: Agent }
  | { action: 'edit' | 'delete'; type: 'event'; item: ClinicalEvent }
  | { action: 'edit' | 'delete'; type: 'balance'; item: FluidBalance };


@Component({
  selector: 'app-history-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './history-modal.component.html',
  styleUrls: ['./history-modal.component.scss'],
})
export class HistoryModalComponent implements OnInit {
  @Input() initialTab: HistoryTab = 'vitals';
  @Input() vitalRecords: VitalRecord[] = [];
  @Input() agents: Agent[] = [];
  @Input() events: ClinicalEvent[] = [];
  @Input() balance: FluidBalance[] = [];
  @Input() readonly = false;

  activeTab: HistoryTab = 'vitals';

  constructor(private modalController: ModalController) { }

  ngOnInit(): void {
    this.activeTab = this.initialTab;
  }

  setTab(tab: HistoryTab): void {
    this.activeTab = tab;
  }

  close(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  editVital(item: VitalRecord): void {
    void this.modalController.dismiss({ action: 'edit', type: 'vital', item } as HistoryAction, 'action');
  }

  deleteVital(item: VitalRecord): void {
    void this.modalController.dismiss({ action: 'delete', type: 'vital', item } as HistoryAction, 'action');
  }

  editAgent(item: Agent): void {
    void this.modalController.dismiss({ action: 'edit', type: 'agent', item } as HistoryAction, 'action');
  }

  deleteAgent(item: Agent): void {
    void this.modalController.dismiss({ action: 'delete', type: 'agent', item } as HistoryAction, 'action');
  }

  editEvent(item: ClinicalEvent): void {
    void this.modalController.dismiss({ action: 'edit', type: 'event', item } as HistoryAction, 'action');
  }

  deleteEvent(item: ClinicalEvent): void {
    void this.modalController.dismiss({ action: 'delete', type: 'event', item } as HistoryAction, 'action');
  }

  editBalance(item: FluidBalance): void {
    void this.modalController.dismiss({ action: 'edit', type: 'balance', item } as HistoryAction, 'action');
  }

  deleteBalance(item: FluidBalance): void {
    void this.modalController.dismiss({ action: 'delete', type: 'balance', item } as HistoryAction, 'action');
  }


  sortedDesc<T extends { timestamp: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
