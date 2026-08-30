import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, documentOutline, refreshOutline } from 'ionicons/icons';

@Component({
  selector: 'app-report-state',
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner],
  templateUrl: './report-state.component.html',
  styleUrls: ['./report-state.component.scss']
})
export class ReportStateComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() empty = false;
  @Input() emptyMessage = 'Nenhum dado encontrado para os filtros selecionados.';
  @Output() retry = new EventEmitter<void>();

  constructor() {
    addIcons({ alertCircleOutline, documentOutline, refreshOutline });
  }
}
