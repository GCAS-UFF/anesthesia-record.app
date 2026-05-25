import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonCheckbox } from '@ionic/angular/standalone';
import { FormSectionComponent } from '../../../../shared/components/form-section/form-section.component';
import { RadioGroupComponent } from '../../../../shared/components/radio-group/radio-group.component';
import { CheckboxGroupComponent } from '../../../../shared/components/checkbox-group/checkbox-group.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';

@Component({
  selector: 'app-tecnica-anestesica-section',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonCheckbox,
    FormSectionComponent,
    RadioGroupComponent,
    CheckboxGroupComponent,
    FormFieldComponent
  ],
  templateUrl: './tecnica-anestesica-section.component.html',
  styleUrls: ['./tecnica-anestesica-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TecnicaAnestesicaSectionComponent implements OnInit {
  @Input() formGroup!: FormGroup;

  // Options
  yesNoOptions = [
    { label: 'Sim', value: 'sim' },
    { label: 'Não', value: 'nao' }
  ];

  assistidaOptions = [
    { label: 'Espontânea', value: 'Espontanea' },
    { label: 'Manual', value: 'Manual' }
  ];

  controladaOptions = [
    { label: 'Volume', value: 'Volume' },
    { label: 'Pressão', value: 'Pressao' }
  ];

  nivelPuncaoOptions = [
    { label: 'L1-L2', value: 'L1-L2' },
    { label: 'L2-L3', value: 'L2-L3' },
    { label: 'L3-L4', value: 'L3-L4' },
    { label: 'L4-L5', value: 'L4-L5' },
    { label: 'Hiato Sacro', value: 'Hiato Sacro' }
  ];

  nervosEstimuladosOptions = [
    { label: 'Femoral', value: 'Femoral' },
    { label: 'Ciático', value: 'Ciatico' },
    { label: 'Iliohipogástrico', value: 'Iliohipogastrico' },
    { label: 'Ilioinguinal', value: 'Ilioinguinal' },
    { label: 'Retrobulbar', value: 'Retrobulbar' },
    { label: 'Peribulbar', value: 'Peribulbar' }
  ];

  suplementacaoO2Options = [
    { label: 'Catéter Nasal', value: 'Cateter Nasal' },
    { label: 'Máscara Facial', value: 'Mascara Facial' },
    { label: 'Guedel', value: 'Guedel' },
    { label: 'Nasofaringe', value: 'Nasofaringe' }
  ];

  constructor() { }

  ngOnInit() { }

}
