import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { FormSectionComponent } from '../../../../shared/components/form-section/form-section.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { maskTimeInput, normalizeTimeInput } from '../../../../shared/utils/time-input.util';

@Component({
  selector: 'app-dados-vitais-section',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonSelect,
    IonSelectOption,
    FormSectionComponent,
    FormFieldComponent,
    TranslatePipe
  ],
  templateUrl: './dados-vitais-section.component.html',
  styleUrls: ['./dados-vitais-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DadosVitaisSectionComponent implements OnInit {
  @Input() formGroup!: FormGroup;

  asaOptions = [
    { label: 'ASA I', value: '1' },
    { label: 'ASA II', value: '2' },
    { label: 'ASA III', value: '3' },
    { label: 'ASA IV', value: '4' },
    { label: 'ASA V', value: '5' },
    { label: 'ASA VI', value: '6' }
  ];

  constructor() { }

  ngOnInit() { }

  onTimeInput(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const masked = maskTimeInput(input.value);
    input.value = masked;
    this.formGroup.get(controlName)?.setValue(masked, { emitEvent: false });
  }

  onTimeBlur(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const normalized = normalizeTimeInput(input.value);
    input.value = normalized;
    this.formGroup.get(controlName)?.setValue(normalized);
  }
}
