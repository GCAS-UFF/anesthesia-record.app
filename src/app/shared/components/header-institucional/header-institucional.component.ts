import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, documentTextOutline } from 'ionicons/icons';
import { HeaderActionButton } from './header-action-button.model';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-header-institucional',
  standalone: true,
  imports: [CommonModule, IonicModule, TranslatePipe],
  templateUrl: './header-institucional.component.html',
  styleUrls: ['./header-institucional.component.scss'],
})
export class HeaderInstitucionalComponent {
  @Input() showBackButton = false;
  @Input() showPreAnestesicaButton = false;
  @Input() preAnestesicaButtonLabel = '';
  @Input() showAnestesicaButton = false;
  @Input() anestesicaButtonLabel = '';
  @Input() actionButtons: HeaderActionButton[] = [];

  @Output() openPreAnestesica = new EventEmitter<void>();
  @Output() openAnestesica = new EventEmitter<void>();
  @Output() backClick = new EventEmitter<void>();

  constructor(private location: Location) {
    addIcons({
      arrowBackOutline,
      documentTextOutline,
    });
  }

  voltar(): void {
    if (this.backClick.observed) {
      this.backClick.emit();
      return;
    }
    this.location.back();
  }

  onActionButtonClick(btn: HeaderActionButton): void {
    if (btn.disabled) return;
    btn.action();
  }

  trackActionButton(_index: number, btn: HeaderActionButton): string {
    return btn.id;
  }
}
