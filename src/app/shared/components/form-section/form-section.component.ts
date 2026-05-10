import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

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
      background: white;
      border-radius: 12px;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section-header {
      background: #f8fafc;
      padding: 12px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .section-title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .section-subtitle {
      margin: 4px 0 0;
      font-size: 12px;
      color: #64748b;
    }
    .section-content {
      padding: 20px;
    }
  `],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class FormSectionComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
}
