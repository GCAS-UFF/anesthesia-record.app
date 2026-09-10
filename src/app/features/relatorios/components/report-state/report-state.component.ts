import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { alertCircleOutline, documentOutline, refreshOutline } from 'ionicons/icons';

@Component({
  selector: 'app-report-state',
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner, TranslatePipe],
  templateUrl: './report-state.component.html',
  styleUrls: ['./report-state.component.scss']
})
export class ReportStateComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() empty = false;
  @Input() emptyMessage = this.translate.instant('relatorios.state.emptyDefault');
  @Output() retry = new EventEmitter<void>();

  constructor(private translate: TranslateService) {
    addIcons({ alertCircleOutline, documentOutline, refreshOutline });
  }
}
