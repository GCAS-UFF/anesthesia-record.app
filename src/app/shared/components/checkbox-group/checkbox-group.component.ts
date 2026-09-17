import { Component, Input, forwardRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
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
            <ion-icon *ngIf="isSelected(option.value)" name="checkmark-circle"></ion-icon>
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
      align-items: stretch;
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
    .checkbox-option {
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
      box-sizing: border-box;
    }
    .checkbox-option:hover {
      background: #dce7ec;
    }
    .checkbox-option.active {
      background: #c6e4ed;
      border-color: #1b8ba6;
      color: #223740;
    }
    .checkbox-box {
      width: 22px;
      height: 22px;
      border: 2px solid rgba(34, 55, 64, 0.22);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fcfdfe;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .active .checkbox-box {
      border-color: #1b8ba6;
      background: #1b8ba6;
      color: white;
    }
    .active .checkbox-box ion-icon {
      font-size: 16px;
      stroke-width: 48;
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
    :host.ng-invalid.ng-touched .checkbox-option {
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
  imports: [CommonModule, IonIcon, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxGroupComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.Default // MUDANÇA: Usar Default em vez de OnPush
})
export class CheckboxGroupComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() options: { label: string, value: any }[] = [];
  @Input() direction: 'horizontal' | 'vertical' = 'horizontal';
  @Input() required: boolean = false;

  value: any[] = [];
  onChange: any = () => { };
  onTouched: any = () => { };

  constructor(private cdr: ChangeDetectorRef) { }

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
    this.cdr.detectChanges();
  }

  writeValue(val: any): void {
    this.value = val || [];
    this.cdr.detectChanges();
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}