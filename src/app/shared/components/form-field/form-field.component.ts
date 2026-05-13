import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="form-field" [class.error]="hasError">
      <label *ngIf="label" class="field-label">
        {{ label }}
        <span *ngIf="required" class="required">*</span>
      </label>
      <div class="field-wrapper">
        <ng-content></ng-content>
      </div>
      <div *ngIf="hasError && errorMsg" class="error-text">
        {{ errorMsg }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
      width: 100%;
    }
    .field-label {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding-left: 4px;
      margin-bottom: 2px;
    }
    .required {
      color: #ef4444;
      margin-left: 2px;
    }
    .field-wrapper {
      width: 100%;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      overflow: hidden;
      min-height: 42px;

      &:focus-within {
        background: white;
        border-color: #cbd5e1;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }

      /* Quando contém input de tempo, encolhe o wrapper */
      &:has(input[type="time"]) {
        width: fit-content;
        min-width: 110px;
      }
    }
    
    ::ng-deep {
      .field-wrapper input, 
      .field-wrapper select, 
      .field-wrapper textarea,
      .field-wrapper ion-input,
      .field-wrapper ion-select {
        background: transparent !important;
        border: none !important;
        padding: 8px 14px !important;
        width: 100% !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        color: #1e293b !important;
        outline: none !important;
        box-shadow: none !important;
        --background: transparent !important;
        --border-width: 0 !important;
        --padding-start: 14px !important;
        --padding-end: 14px !important;
        --highlight-height: 0 !important;
      }

      .field-wrapper input[type="time"] {
        max-width: 90px;
        text-align: center;
        padding-left: 4px !important;
        padding-right: 4px !important;
      }
      
      .field-wrapper input[type="date"] {
        max-width: 130px;
        text-align: center;
      }
      
      .field-wrapper ion-select {
        --padding-top: 0;
        --padding-bottom: 0;
        --padding-start: 14px;
        --padding-end: 14px;
        height: 42px;
        width: 100%;
        display: flex;
        align-items: center;
        margin: 0 !important;
      }
    }

    .error-text {
      font-size: 11px;
      color: #ef4444;
      margin-top: 4px;
      padding-left: 4px;
    }
    .error .field-wrapper {
      border-color: #ef4444;
      background: #fef2f2;
    }
    .error .field-label {
      color: #ef4444;
    }

    /* Validação automática sênior */
    :host:has(.ng-invalid.ng-touched) .field-wrapper {
      border-color: #ef4444 !important;
      background: #fef2f2 !important;
      animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
    :host:has(.ng-invalid.ng-touched) .field-label {
      color: #ef4444 !important;
    }

    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }
  `]
})
export class FormFieldComponent {
  @Input() label: string = '';
  @Input() required: boolean = false;
  @Input() hasError: boolean = false;
  @Input() errorMsg: string = '';
}
