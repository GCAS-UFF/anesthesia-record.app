import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * FA-028 - Mensagem de erro reutilizável
 * Exibe alerta visual padronizado.
 */
@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.scss']
})
export class ErrorMessageComponent {
  @Input() message: string = '';
}
