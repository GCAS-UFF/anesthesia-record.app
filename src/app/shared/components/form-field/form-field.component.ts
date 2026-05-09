import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-form-field',
  template: `
    <div class="form-field" [class.error]="hasError">
      <label *ngIf="label" class="field-label">
        {{ label }}
        <span *ngIf="required" class="required">*</span>
      </label>
      <div class="field-control">
        <ng-content></ng-content>
      </div>
      <div *ngIf="errorMsg" class="error-text">{{ errorMsg }}</div>
    </div>
  `,
  styles: [`
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
      width: 100%;
    }
    .field-label {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }
    .required {
      color: #dc2626;
    }
    .field-control {
      width: 100%;
    }
    .error-text {
      font-size: 11px;
      color: #dc2626;
      margin-top: 2px;
    }
    .error .field-label {
      color: #dc2626;
    }
    ::ng-content ion-input, ::ng-content ion-select, ::ng-content ion-textarea, ::ng-content input, ::ng-content select {
        --padding-start: 12px;
        --padding-end: 12px;
        --background: #f8fafc;
        --border-radius: 8px;
        --border-color: #e2e8f0;
        --border-style: solid;
        --border-width: 1px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        padding: 10px 12px;
        width: 100%;
        font-size: 14px;
        color: #1e293b;
        outline: none;
    }
    ::ng-content input:focus, ::ng-content select:focus {
        border-color: #3b82f6;
        background: white;
    }
  `],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class FormFieldComponent {
  @Input() label: string = '';
  @Input() required: boolean = false;
  @Input() hasError: boolean = false;
  @Input() errorMsg: string = '';
}
