import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkbox-group',
  template: `
    <div class="checkbox-container" [class.vertical]="direction === 'vertical'">
      <label *ngIf="label" class="group-label">{{ label }} <span *ngIf="required" class="required">*</span></label>
      <div class="options-grid">
        <div *ngFor="let option of options" 
             class="checkbox-option" 
             [class.active]="isSelected(option.value)"
             (click)="toggle(option.value)">
          <div class="checkbox-box">
            <ion-icon *ngIf="isSelected(option.value)" name="checkmark-outline"></ion-icon>
          </div>
          <span class="option-label">{{ option.label }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .checkbox-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .group-label {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding-left: 4px;
      margin-bottom: 2px;
    }
    .required {
      color: #dc2626;
    }
    .options-grid {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .vertical .options-grid {
      flex-direction: column;
    }
    .checkbox-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .checkbox-option:hover {
      background: #f1f5f9;
    }
    .checkbox-option.active {
      background: #f8fafc;
      border-color: #60a5fa;
      color: #1e293b;
    }
    .checkbox-box {
      width: 22px;
      height: 22px;
      border: 2px solid #cbd5e1;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      transition: all 0.2s ease;
    }
    .active .checkbox-box {
      border-color: #60a5fa;
      background: #60a5fa;
      color: white;
    }
    .active .checkbox-box ion-icon {
      font-size: 16px;
      stroke-width: 48;
    }
    .option-label {
      font-size: 14px;
      font-weight: 500;
    }
    :host.ng-invalid.ng-touched {
      display: block;
      animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
    :host.ng-invalid.ng-touched .checkbox-option {
      border-color: #ef4444 !important;
      background-color: #fef2f2 !important;
    }
    :host.ng-invalid.ng-touched .group-label {
      color: #ef4444 !important;
    }
    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }
  `],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxGroupComponent),
      multi: true
    }
  ]
})
export class CheckboxGroupComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() options: { label: string, value: any }[] = [];
  @Input() direction: 'horizontal' | 'vertical' = 'horizontal';
  @Input() required: boolean = false;

  value: any[] = [];
  onChange: any = () => {};
  onTouched: any = () => {};

  isSelected(val: any): boolean {
    return this.value && this.value.includes(val);
  }

  toggle(val: any) {
    if (!this.value) this.value = [];
    
    const index = this.value.indexOf(val);
    if (index > -1) {
      this.value.splice(index, 1);
    } else {
      this.value.push(val);
    }
    
    this.onChange([...this.value]);
    this.onTouched();
  }

  writeValue(val: any): void {
    this.value = val || [];
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
