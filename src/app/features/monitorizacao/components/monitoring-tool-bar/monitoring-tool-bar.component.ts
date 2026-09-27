import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  ellipsisHorizontalOutline, flashOutline, listOutline, medkitOutline, pulseOutline, waterOutline,
} from 'ionicons/icons';

export type MonitoringTool = 'vital' | 'agent' | 'balance' | 'event' | 'history' | 'more';

interface ToolDef { id: MonitoringTool; icon: string; labelKey: string; editOnly: boolean; }

const TOOLS: ToolDef[] = [
  { id: 'vital', icon: 'pulse-outline', labelKey: 'monitorizacao.shell.tools.vital', editOnly: true },
  { id: 'agent', icon: 'medkit-outline', labelKey: 'monitorizacao.shell.tools.agent', editOnly: true },
  { id: 'balance', icon: 'water-outline', labelKey: 'monitorizacao.shell.tools.balance', editOnly: true },
  { id: 'event', icon: 'flash-outline', labelKey: 'monitorizacao.shell.tools.event', editOnly: true },
  { id: 'history', icon: 'list-outline', labelKey: 'monitorizacao.shell.tools.history', editOnly: false },
  { id: 'more', icon: 'ellipsis-horizontal-outline', labelKey: 'monitorizacao.shell.tools.more', editOnly: false },
];

/**
 * Ferramentas de registro e consulta. Em retrato é uma barra na base (alcance do
 * polegar, libera largura para a linha do tempo); em paisagem é um trilho à direita.
 * A ordem é fixa para preservar a memória muscular.
 */
@Component({
  selector: 'app-monitoring-tool-bar',
  standalone: true,
  imports: [CommonModule, TranslatePipe, IonIcon],
  template: `
    <nav class="tools" [attr.aria-label]="'monitorizacao.shell.tools.aria' | translate">
      <button
        type="button"
        class="tools__btn"
        *ngFor="let tool of tools"
        [class.tools__btn--active]="active === tool.id"
        [disabled]="readonly && tool.editOnly"
        (click)="toolClick.emit(tool.id)"
      >
        <ion-icon [name]="tool.icon" aria-hidden="true"></ion-icon>
        <span>{{ tool.labelKey | translate }}</span>
        <b class="tools__badge" *ngIf="tool.id === 'agent' && activePumps > 0">{{ activePumps }}</b>
      </button>
    </nav>
  `,
  styleUrls: ['./monitoring-tool-bar.component.scss'],
})
export class MonitoringToolBarComponent {
  @Input() readonly = false;
  @Input() active: MonitoringTool | null = null;
  @Input() activePumps = 0;
  @Output() toolClick = new EventEmitter<MonitoringTool>();

  readonly tools = TOOLS;

  constructor() {
    addIcons({ pulseOutline, medkitOutline, waterOutline, flashOutline, listOutline, ellipsisHorizontalOutline });
  }
}
