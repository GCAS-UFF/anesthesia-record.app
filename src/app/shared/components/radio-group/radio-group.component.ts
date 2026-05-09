import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-radio-group',
  template: `
    <div class="radio-container" [class.vertical]="direction === 'vertical'">
      <label *ngIf="label" class="group-label">{{ label }} <span *ngIf="required" class="required">*</span></label>
      <div class="options-grid">
        <div *ngFor="let option of options" 
             class="radio-option" 
             [class.active]="value === option.value"
             (click)="select(option.value)">
          <div class="radio-circle">
            <div class="radio-inner" *ngIf="value === option.value"></div>
          </div>
          <span class="option-label">{{ option.label }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .radio-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .group-label {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }
    .required {
      color: #dc2626;
    }
    .options-grid {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .vertical .options-grid {
      flex-direction: column;
    }
    .radio-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 100px;
    }
    .radio-option:hover {
      background: #f1f5f9;
    }
    .radio-option.active {
      background: #eff6ff;
      border-color: #3b82f6;
      color: #1d4ed8;
    }
    .radio-circle {
      width: 18px;
      height: 18px;
      border: 2px solid #cbd5e1;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
    }
    .active .radio-circle {
      border-color: #3b82f6;
    }
    .radio-inner {
      width: 10px;
      height: 10px;
      background: #3b82f6;
      border-radius: 50%;
    }
    .option-label {
      font-size: 14px;
      font-weight: 500;
    }
  `],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioGroupComponent),
      multi: true
    }
  ]
})
export class RadioGroupComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() options: { label: string, value: any }[] = [];
  @Input() direction: 'horizontal' | 'vertical' = 'horizontal';
  @Input() required: boolean = false;

  value: any = null;
  onChange: any = () => {};
  onTouched: any = () => {};

  select(val: any) {
    this.value = val;
    this.onChange(val);
    this.onTouched();
  }

  writeValue(val: any): void {
    this.value = val;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
