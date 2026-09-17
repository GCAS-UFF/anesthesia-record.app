import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
      font-family: 'Manrope', system-ui, -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 800;
      color: #4a6572;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding-left: 4px;
      margin-bottom: 2px;
    }
    .required {
      color: #c23a6b;
    }
    .options-grid {
      display: flex;
      gap: 8px;
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
      min-height: 44px;
      background: #f3f7f9;
      border: 1px solid rgba(34, 55, 64, 0.12);
      border-radius: 0.625rem;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 100px;
      box-sizing: border-box;
    }
    .radio-option:hover {
      background: #dce7ec;
    }
    .radio-option.active {
      background: #c6e4ed;
      border-color: #1b8ba6;
      color: #223740;
    }
    .radio-circle {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(34, 55, 64, 0.22);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fcfdfe;
      flex-shrink: 0;
    }
    .active .radio-circle {
      border-color: #1b8ba6;
      background: #fcfdfe;
    }
    .radio-inner {
      width: 10px;
      height: 10px;
      background: #1b8ba6;
      border-radius: 50%;
    }
    .option-label {
      font-family: 'Manrope', system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
    }
    :host.ng-invalid.ng-touched {
      display: block;
      animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
    :host.ng-invalid.ng-touched .radio-option {
      border-color: #c23a6b !important;
      background-color: #fbf1de !important;
    }
    :host.ng-invalid.ng-touched .group-label {
      color: #c23a6b !important;
    }
    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }
  `],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
