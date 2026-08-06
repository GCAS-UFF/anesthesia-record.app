import { Component, Input, OnInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonCheckbox } from '@ionic/angular/standalone';
import { FormSectionComponent } from '../../../../shared/components/form-section/form-section.component';
import { RadioGroupComponent } from '../../../../shared/components/radio-group/radio-group.component';
import { CheckboxGroupComponent } from '../../../../shared/components/checkbox-group/checkbox-group.component';

@Component({
  selector: 'app-tecnica-anestesica-section',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonCheckbox,
    FormSectionComponent,
    RadioGroupComponent,
    CheckboxGroupComponent
  ],
  templateUrl: './tecnica-anestesica-section.component.html',
  styleUrls: ['./tecnica-anestesica-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class TecnicaAnestesicaSectionComponent implements OnInit, AfterViewInit {
  @Input() formGroup!: FormGroup;

  yesNoOptions = [{ label: 'Sim', value: 'sim' }, { label: 'Não', value: 'nao' }];

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

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.clearNumberWhenUnchecked('vaGuedel', 'guedelNo');
    this.clearNumberWhenUnchecked('vaMascLaringea', 'mascLaringeaNo');
    this.clearNumberWhenUnchecked('vaMascFacial', 'mascFacialNo');
    this.clearNumberWhenUnchecked('vaTubo', 'tuboNo');
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 100);
  }

  toggleO2(checked: boolean, value: string) {
    const ctrl = this.formGroup.get('tipoSuplementacaoO2');
    const current: string[] = ctrl?.value || [];
    let next: string[];
    if (checked) {
      next = current.includes(value) ? current : [...current, value];
    } else {
      next = current.filter(v => v !== value);
    }
    ctrl?.setValue(next);
    ctrl?.markAsDirty();
    this.cdr.detectChanges();
  }

  refresh() {
    this.cdr.detectChanges();
  }

  private clearNumberWhenUnchecked(
    checkboxControl: string,
    numberControl: string
  ): void {
    this.formGroup.get(checkboxControl)?.valueChanges.subscribe(checked => {
      if (!checked) {
        this.formGroup.patchValue({
          [numberControl]: null
        });

        if (checkboxControl === 'vaTubo') {
          this.formGroup.patchValue({
            cuff: false,
            oral: false,
            nasal: false,
            iot: false,
            facil: false,
            dificil: false
          });
        }
      }
    });
  }
}