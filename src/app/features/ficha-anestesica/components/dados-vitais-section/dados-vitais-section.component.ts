import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FormSectionComponent } from '../../../../shared/components/form-section/form-section.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';

@Component({
  selector: 'app-dados-vitais-section',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    FormSectionComponent,
    FormFieldComponent
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
}
