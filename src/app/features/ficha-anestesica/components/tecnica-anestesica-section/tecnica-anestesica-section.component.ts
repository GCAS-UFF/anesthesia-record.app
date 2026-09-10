import { Component, Input, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonCheckbox } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
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
    CheckboxGroupComponent,
    TranslatePipe
  ],
  templateUrl: './tecnica-anestesica-section.component.html',
  styleUrls: ['./tecnica-anestesica-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class TecnicaAnestesicaSectionComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() formGroup!: FormGroup;

  yesNoOptions: { label: string; value: string }[] = [];
  assistidaOptions: { label: string; value: string }[] = [];
  controladaOptions: { label: string; value: string }[] = [];
  nivelPuncaoOptions: { label: string; value: string }[] = [];
  posicaoPuncaoOptions: { label: string; value: string }[] = [];
  nervosEstimuladosOptions: { label: string; value: string }[] = [];
  suplementacaoO2Options: { label: string; value: string }[] = [];

  private langChangeSub?: Subscription;

  constructor(private cdr: ChangeDetectorRef, private translate: TranslateService) {
    this.applyTranslations();
    this.langChangeSub = this.translate.onLangChange.subscribe(() => this.applyTranslations());
  }

  private applyTranslations(): void {
    this.yesNoOptions = [
      { label: this.translate.instant('fichaAnestesica.tecnica.yesNo.sim'), value: 'sim' },
      { label: this.translate.instant('fichaAnestesica.tecnica.yesNo.nao'), value: 'nao' }
    ];

    this.assistidaOptions = [
      { label: this.translate.instant('fichaAnestesica.tecnica.respiracaoAssistidaOptions.espontanea'), value: 'Espontanea' },
      { label: this.translate.instant('fichaAnestesica.tecnica.respiracaoAssistidaOptions.manual'), value: 'Manual' }
    ];

    this.controladaOptions = [
      { label: this.translate.instant('fichaAnestesica.tecnica.respiracaoControladaOptions.volume'), value: 'Volume' },
      { label: this.translate.instant('fichaAnestesica.tecnica.respiracaoControladaOptions.pressao'), value: 'Pressao' }
    ];

    this.nivelPuncaoOptions = [
      { label: this.translate.instant('fichaAnestesica.tecnica.nivelPuncaoOptions.l1l2'), value: 'L1-L2' },
      { label: this.translate.instant('fichaAnestesica.tecnica.nivelPuncaoOptions.l2l3'), value: 'L2-L3' },
      { label: this.translate.instant('fichaAnestesica.tecnica.nivelPuncaoOptions.l3l4'), value: 'L3-L4' },
      { label: this.translate.instant('fichaAnestesica.tecnica.nivelPuncaoOptions.l4l5'), value: 'L4-L5' },
      { label: this.translate.instant('fichaAnestesica.tecnica.nivelPuncaoOptions.hiatoSacro'), value: 'Hiato Sacro' }
    ];

    this.posicaoPuncaoOptions = [
      { label: this.translate.instant('fichaAnestesica.tecnica.posicaoPuncaoOptions.sentada'), value: 'Sentada' },
      { label: this.translate.instant('fichaAnestesica.tecnica.posicaoPuncaoOptions.decubitoLateral'), value: 'Decubito' }
    ];

    this.nervosEstimuladosOptions = [
      { label: this.translate.instant('fichaAnestesica.tecnica.nervosEstimuladosOptions.femoral'), value: 'Femoral' },
      { label: this.translate.instant('fichaAnestesica.tecnica.nervosEstimuladosOptions.ciatico'), value: 'Ciatico' },
      { label: this.translate.instant('fichaAnestesica.tecnica.nervosEstimuladosOptions.iliohipogastrico'), value: 'Iliohipogastrico' },
      { label: this.translate.instant('fichaAnestesica.tecnica.nervosEstimuladosOptions.ilioinguinal'), value: 'Ilioinguinal' },
      { label: this.translate.instant('fichaAnestesica.tecnica.nervosEstimuladosOptions.retrobulbar'), value: 'Retrobulbar' },
      { label: this.translate.instant('fichaAnestesica.tecnica.nervosEstimuladosOptions.peribulbar'), value: 'Peribulbar' }
    ];

    this.suplementacaoO2Options = [
      { label: this.translate.instant('fichaAnestesica.tecnica.suplementacaoO2Options.cateterNasal'), value: 'Cateter Nasal' },
      { label: this.translate.instant('fichaAnestesica.tecnica.suplementacaoO2Options.mascaraFacial'), value: 'Mascara Facial' },
      { label: this.translate.instant('fichaAnestesica.tecnica.suplementacaoO2Options.guedel'), value: 'Guedel' },
      { label: this.translate.instant('fichaAnestesica.tecnica.suplementacaoO2Options.nasofaringe'), value: 'Nasofaringe' }
    ];

    this.cdr.markForCheck();
  }

  ngOnInit() {
    this.clearNumberWhenUnchecked('vaGuedel', 'guedelNo');
    this.clearNumberWhenUnchecked('vaMascLaringea', 'mascLaringeaNo');
    this.clearNumberWhenUnchecked('vaMascFacial', 'mascFacialNo');
    this.clearNumberWhenUnchecked('vaTubo', 'tuboNo');
  }

  ngOnDestroy() {
    this.langChangeSub?.unsubscribe();
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