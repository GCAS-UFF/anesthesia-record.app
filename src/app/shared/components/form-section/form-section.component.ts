import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-form-section',
  template: `
    <div class="form-section">
      <div class="section-header">
        <h3 class="section-title">{{ title }}</h3>
        <p *ngIf="subtitle" class="section-subtitle">{{ subtitle }}</p>
      </div>
      <div class="section-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .form-section {
      background: #fcfdfe;
      border-radius: 1.25rem;
      margin-bottom: 16px;
      border: 1px solid rgba(34, 55, 64, 0.12);
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(34, 55, 64, 0.06);
    }
    .section-header {
      padding: 14px 16px 0 16px;
    }
    .section-title {
      margin: 0;
      font-family: 'Sora', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #223740;
    }
    .section-subtitle {
      margin: 4px 0 0;
      font-family: 'Manrope', system-ui, -apple-system, sans-serif;
      font-size: 11px;
      color: #4a6572;
      font-weight: 500;
    }
    .section-content {
      padding: 10px 16px 16px 16px;
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class FormSectionComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() icon: string = '';
}
