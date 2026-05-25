import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-form-section',
  template: `
    <div class="form-section">
      <div class="section-header">
        <h3 class="section-title">
          <span class="icon" *ngIf="icon">{{ icon }}</span>
          {{ title }}
        </h3>
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
      border-radius: 28px;
      margin-bottom: 24px;
      border: 1px solid #edf2f7;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01);
    }
    .section-header {
      background: white;
      padding: 24px 28px 12px 28px;
    }
    .section-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 12px;
      border-bottom: 2px solid #f1f5f9;
    }
    .icon {
        font-size: 20px;
    }
    .section-subtitle {
      margin: 8px 0 0;
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }
    .section-content {
      padding: 20px 28px 28px 28px;
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
