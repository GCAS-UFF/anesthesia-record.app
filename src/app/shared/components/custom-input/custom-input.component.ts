import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

/**
 * FA-028 - Input customizado reutilizável
 * Suporta ícone, label, integração com Reactive Forms.
 */
@Component({
  selector: 'app-custom-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './custom-input.component.html',
  styleUrls: ['./custom-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomInputComponent),
      multi: true
    }
  ]
})
export class CustomInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() type: 'text' | 'password' = 'text';
  @Input() icon = '';
  @Input() placeholder = '';
  @Input() required = false;

  value = '';
  disabled = false;

  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.value = value;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
