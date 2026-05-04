import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

/**
 * FA-028 - Botão reutilizável com loading
 * Exibe spinner e desabilita durante ação.
 */
@Component({
  selector: 'app-loading-button',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './loading-button.component.html',
  styleUrls: ['./loading-button.component.scss']
})
export class LoadingButtonComponent {
  @Input() loading = false;
  @Input() disabled = false;
  @Input() expand: 'block' | 'full' | 'default' = 'block';
  @Input() color: string = 'primary';
  @Input() type: 'button' | 'submit' = 'button';
}
