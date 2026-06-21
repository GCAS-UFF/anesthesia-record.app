import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { IonButton, IonIcon, IonCheckbox, IonSpinner } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of, Subscription } from "rxjs";
import { delay, debounceTime } from "rxjs/operators";
import { addIcons } from 'ionicons';
import {
  pencilOutline,
  trashOutline,
  closeCircleOutline,
  returnDownForwardOutline,
  saveOutline,
  syncOutline,
  printOutline,
  arrowBackOutline,
  closeOutline,
  addOutline,
  timeOutline
} from 'ionicons/icons';

// Shared Components
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { PatientInfoCardComponent } from '../../shared/components/patient-info-card/patient-info-card.component';
import { FormSectionComponent } from '../../shared/components/form-section/form-section.component';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { RadioGroupComponent } from '../../shared/components/radio-group/radio-group.component';
import { CheckboxGroupComponent } from '../../shared/components/checkbox-group/checkbox-group.component';
import { TecnicaAnestesicaSectionComponent } from './components/tecnica-anestesica-section/tecnica-anestesica-section.component';
import { DadosVitaisSectionComponent } from './components/dados-vitais-section/dados-vitais-section.component';

// Services
import { SurgeryService } from 'src/app/core/services/surgery.service';
import { AnesthesiaRecordService } from 'src/app/core/services/anesthesia-record.service';
import { AnesthesiaRecordModel } from 'src/app/shared/models/anesthesia-record.model';

@Component({
  selector: 'app-ficha-anestesica',
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonIcon,
    IonCheckbox,
    IonSpinner,
    ReactiveFormsModule,
    StatusBarComponent,
    HeaderInstitucionalComponent,
    PatientInfoCardComponent,
    FormSectionComponent,
    FormFieldComponent,
    RadioGroupComponent,
    CheckboxGroupComponent,
    TecnicaAnestesicaSectionComponent,
    DadosVitaisSectionComponent
  ],
  templateUrl: './ficha-anestesica.component.html',
  styleUrls: ['./ficha-anestesica.component.scss']
})
export class FichaAnestesicaComponent implements OnInit {
  form!: FormGroup;
  pacienteId: string | null = null;
  patient: any = null;
  selectedSurgery: any = null;
  selectedProcedure: any = null;

  // Opções para os campos baseados na ficha HUAP
  viaPreOptions = [
    { label: 'VO', value: 'VO' },
    { label: 'IM', value: 'IM' },
    { label: 'IV', value: 'IV' },
    { label: 'OUTRAS', value: 'Outras' }
  ];

  posicaoOptions = [
    { label: 'SUPINA', value: 'SUPINA' },
    { label: 'PRONA', value: 'PRONA' },
    { label: 'SENTADO', value: 'SENTADO' },
    { label: 'LATERAL ESQUERDO', value: 'LATERAL ESQUERDO' },
    { label: 'LATERAL DIREITO', value: 'LATERAL DIREITO' },
    { label: 'TRENDELENBURG', value: 'TRENDELENBURG' },
    { label: 'LITOTÔMICA', value: 'LITOTÔMICA' }
  ];

  acessoVenosoOptions = [
    { label: 'Periférico', value: 'Periferico' },
    { label: 'Central', value: 'Central' }
  ];

  assistidaOptions = [
    { label: 'Manual', value: 'Manual' },
    { label: 'Máscara', value: 'Mascara' }
  ];

  controladaOptions = [
    { label: 'Mecânica', value: 'Mecanica' },
    { label: 'Manual', value: 'Manual' }
  ];

  suplementacaoO2Options = [
    { label: 'Máscara Facial', value: 'Mascara Facial' },
    { label: 'Cateter Nasal', value: 'Cateter Nasal' },
    { label: 'Outros', value: 'Outros' }
  ];

  dispositivosVAOptions = [
    { label: 'Guedel', value: 'Guedel' },
    { label: 'Másc. Laríngea', value: 'MascLaringea' },
    { label: 'Másc. Facial', value: 'MascFacial' },
    { label: 'Tubo', value: 'Tubo' }
  ];

  nivelPuncaoOptions = [
    { label: 'L1-L2', value: 'L1-L2' },
    { label: 'L2-L3', value: 'L2-L3' },
    { label: 'L3-L4', value: 'L3-L4' },
    { label: 'L4-L5', value: 'L4-L5' },
    { label: 'Hiato Sacro', value: 'Hiato Sacro' }
  ];

  neuroestimuladorOptions = [
    { label: 'Femoral', value: 'Femoral' },
    { label: 'Ciático', value: 'Ciatico' },
    { label: 'Iliohipogástrico', value: 'Iliohipogastrico' },
    { label: 'Ilioinguinal', value: 'Ilioinguinal' },
    { label: 'Retrobulbar', value: 'Retrobulbar' },
    { label: 'Peribulbar', value: 'Peribulbar' },
    { label: 'Outros', value: 'Outros' }
  ];

  tecnicasVAOptions = [
    { label: 'Laringoscopia', value: 'Laringoscopia' },
    { label: 'Retrógrada', value: 'Retrograda' },
    { label: 'Videolaringoscopia', value: 'Videolaringoscopia' },
    { label: 'Broncofibroscopia', value: 'Broncofibroscopia' },
    { label: 'Traqueostomia', value: 'Traqueostomia' },
    { label: 'Outras', value: 'Outras' }
  ];

  condicoesAltaOptions = [
    { label: 'Acordado', value: 'Acordado' },
    { label: 'Sonolento', value: 'Sonolento' },
    { label: 'Intubado', value: 'Intubado' }
  ];

  destinoOptions = [
    { label: 'RPA', value: 'RPA' },
    { label: 'Quarto', value: 'Quarto' },
    { label: 'CTI', value: 'CTI' },
    { label: 'Dayclinic', value: 'Dayclinic' },
    { label: 'Alta', value: 'Alta' }
  ];

  yesNoOptions = [{ label: 'Sim', value: 'sim' }, { label: 'Não', value: 'nao' }];

  aldereteFields = [
    {
      label: 'Consciência', control: 'consciencia', options: [
        { score: 2, text: 'Totalmente desperto' },
        { score: 1, text: 'Desperta quando chamado' },
        { score: 0, text: 'Não responde' }
      ]
    },
    {
      label: 'Atividade', control: 'atividade', options: [
        { score: 2, text: 'Movimento de todas extremidades' },
        { score: 1, text: 'Movimento de duas extremidades' },
        { score: 0, text: 'Incapaz de se mover' }
      ]
    },
    {
      label: 'Circulação', control: 'circulacao', options: [
        { score: 2, text: 'PA +/- 20% do valor pré-anestésico' },
        { score: 1, text: 'PA de 20 a 50% do valor pré-anestésico' },
        { score: 0, text: 'PA +/- 50% do valor pré-anestésico' }
      ]
    },
    {
      label: 'Respiração', control: 'respiracao', options: [
        { score: 2, text: 'Respira profundamente e tosse' },
        { score: 1, text: 'Dispnéia, hipoventilação' },
        { score: 0, text: 'Apneia' }
      ]
    },
    {
      label: 'SpO2', control: 'saturacao', options: [
        { score: 2, text: 'Mantém SpO2 > 90% em ar ambiente' },
        { score: 1, text: 'Necessita de O2 para manter SpO2 > 90%' },
        { score: 0, text: 'SpO2 < 90% mesmo com O2 suplementar' }
      ]
    }
  ];

  antibioticsList: any[] = [];
  isLoading = false;
  isSaving = false;
  showValidationErrors = false;
  private autoSaveSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private surgeryService: SurgeryService,
    private anesthesiaService: AnesthesiaRecordService,
    private alertController: AlertController,
    private toastController: ToastController,
    private location: Location
  ) {
    addIcons({
      pencilOutline,
      trashOutline,
      closeCircleOutline,
      returnDownForwardOutline,
      saveOutline,
      syncOutline,
      printOutline,
      arrowBackOutline,
      closeOutline,
      addOutline,
      timeOutline
    });
    this.initForm();
  }

  ngOnInit() {
    this.pacienteId = this.route.snapshot.paramMap.get('id');
    if (this.pacienteId) {
      this.loadPatientData(this.pacienteId);
    }
    this.setupConditionalLogic();

    // [FA-043] Auto-save rascunho a cada mudança (debounce de 1s)
    this.autoSaveSub = this.form.valueChanges.pipe(
      debounceTime(1000)
    ).subscribe(values => {
      if (this.pacienteId) {
        this.anesthesiaService.saveDraft(this.pacienteId, {
          ...values,
          antibioticsList: this.antibioticsList
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.autoSaveSub) {
      this.autoSaveSub.unsubscribe();
    }
  }

  private initForm() {
    this.form = this.fb.group({
      // 1. Segurança do Paciente
      seguranca: this.fb.group({
        identificadoAvaliado: ['', Validators.required],
        consentimentoAssinado: ['', Validators.required],
        equipamentosChecados: ['', Validators.required],
        atencao: ['']
      }),

      // 2. Pré-Indução
      preInducao: this.fb.group({
        recebeuMedPrevia: ['', Validators.required],
        hora: [''],
        farmaco: [''],
        via: [''],
        outrasVia: ['']
      }),

      // 3. Antibiótico Profilático
      antibiotico: this.fb.group({
        temAntibiotico: ['', Validators.required],
        atbNome: [''],
        atbDose: [''],
        atbHora: [''],
        temRepique: [''],
        atbIndex: [null],
        repiqueDose: [''],
        repiqueHora: ['']
      }),

      // 4. Dados Vitais e Antropométricos
      dadosVitais: this.fb.group({
        pa: ['', Validators.required],
        fr: ['', Validators.required],
        temp: ['', Validators.required],
        spo2: ['', Validators.required],
        peso: ['', Validators.required],
        asa: ['', Validators.required],
        entradaSala: ['', Validators.required]
      }),

      // 5. Equipe Cirúrgica e Pré-Procedimento
      equipe: this.fb.group({
        cirurgiao: ['', Validators.required],
        assistente: ['', Validators.required],
        diagnosticoPre: ['', Validators.required],
        horaInicioAnestesia: ['', Validators.required]
      }),

      // 6. Posição Operatória
      posicao: this.fb.group({
        posicoes: [[]],
        outrasPosicao: [''],
        usoCoxim: ['', Validators.required],
        localCoxim: [''],
        acessoVenoso: [[]],
        outroAcesso: [''],
        localAcesso: [''],
        dificuldadePuncao: ['', Validators.required]
      }),

      // 7. Técnica Anestésica
      tecnica: this.fb.group({
        anestesiaGeral: ['', Validators.required],
        respiracaoAssistida: [[]],
        respiracaoControlada: [[]],
        circuitoAbsorvedor: ['', Validators.required],
        vaGuedel: [false],
        vaMascLaringea: [false],
        vaMascFacial: [false],
        vaTubo: [false],
        guedelNo: [''],
        mascLaringeaNo: [''],
        mascFacialNo: [''],
        tuboNo: [''],
        cuff: [false],
        iot: [false],
        oral: [false],
        nasal: [false],
        facil: [false],
        dificil: [false],
        tipoSimples: [false],
        tipoOutras: [false],
        tipoOutrasTexto: [''],
        tipoEndobronquico: [false],
        tipoAramado: [false],
        tecLaringoscopia: [false],
        tecBroncofibroscopia: [false],
        tecRetrograda: [false],
        tecTraqueostomia: [false],
        tecVideolaringoscopia: [false],
        tecVAOutras: [false],
        tecVAOutrasTexto: [''],
        bloqueiosEspinhais: ['', Validators.required],
        nivelPuncao: [[]],
        posicaoPuncao: [''], // Sentada / Decúbito
        cateter: [''],
        opioide: [''],
        numeroPuncoes: [''],

        sedacao: ['', Validators.required],
        suplementacaoO2: ['', Validators.required],
        tipoSuplementacaoO2: [[]],
        suplementacaoO2TemOutros: [false],
        suplementacaoO2Outros: [''],

        bloqueioPlexo: ['', Validators.required],
        neuroestimulador: [''],
        nervosEstimulados: [[]],
        nervosEstimuladosOutros: ['']
      }),

      // 8. Pós-Procedimento
      posProcedimento: this.fb.group({
        cirurgiaRealizada: ['', Validators.required],
        horaTerminoCirurgia: ['', Validators.required],
        diagnosticoPos: ['', Validators.required],
        horaTerminoAnestesia: ['', Validators.required]
      }),

      // 9. Índice de Alderete e Kroulik
      alderete: this.fb.group({
        consciencia: [''],
        atividade: [''],
        circulacao: [''],
        respiracao: [''],
        saturacao: [''],
        horaAvaliacao: [''],
        condicoesClinicasAlta: [[]],
        condicoesAltaOutras: [''],
        destino: ['', Validators.required],
        dor: ['', Validators.required],
        dorUsouENV: [false],
        dorENV: [''],
        dorUsouPAINAD: [false],
        dorPAINAD: [''],
        dorUsouBPS: [false],
        dorBPS: [''],
        conduta: ['']
      }),

      // 10. Assinaturas
      assinaturas: this.fb.group({
        primeiroAnestesista: ['', Validators.required],
        segundoAnestesista: [''],
        dataAssinatura: [new Date().toISOString().split('T')[0], Validators.required]
      })
    });
  }

  private setupConditionalLogic() {
    const atbGroup = this.form.get('antibiotico') as FormGroup;
    const tecGroup = this.form.get('tecnica') as FormGroup;
    const aldGroup = this.form.get('alderete') as FormGroup;

    if (atbGroup) {
      atbGroup.get('temAntibiotico')?.valueChanges.subscribe(val => {
        const temRepiqueCtrl = atbGroup.get('temRepique');
        if (val === 'sim') {
          temRepiqueCtrl?.setValidators([Validators.required]);
        } else {
          temRepiqueCtrl?.clearValidators();
          temRepiqueCtrl?.setValue('');
        }
        temRepiqueCtrl?.updateValueAndValidity();
      });
    }

    if (tecGroup) {
      tecGroup.get('bloqueiosEspinhais')?.valueChanges.subscribe(val => {
        const cateterCtrl = tecGroup.get('cateter');
        const opioideCtrl = tecGroup.get('opioide');
        if (val === 'sim') {
          cateterCtrl?.setValidators([Validators.required]);
          opioideCtrl?.setValidators([Validators.required]);
        } else {
          cateterCtrl?.clearValidators();
          cateterCtrl?.setValue('');
          opioideCtrl?.clearValidators();
          opioideCtrl?.setValue('');
        }
        cateterCtrl?.updateValueAndValidity();
        opioideCtrl?.updateValueAndValidity();
      });

      tecGroup.get('bloqueioPlexo')?.valueChanges.subscribe(val => {
        const neuroCtrl = tecGroup.get('neuroestimulador');
        if (val === 'sim') {
          neuroCtrl?.setValidators([Validators.required]);
        } else {
          neuroCtrl?.clearValidators();
          neuroCtrl?.setValue('');
        }
        neuroCtrl?.updateValueAndValidity();
      });
    }

    if (aldGroup) {
      aldGroup.get('dor')?.valueChanges.subscribe(val => {
        if (val === 'nao') {
          aldGroup.get('dorUsouENV')?.setValue(false, { emitEvent: false });
          aldGroup.get('dorUsouPAINAD')?.setValue(false, { emitEvent: false });
          aldGroup.get('dorUsouBPS')?.setValue(false, { emitEvent: false });
          
          const envVal = aldGroup.get('dorENV');
          envVal?.clearValidators();
          envVal?.setValue('', { emitEvent: false });
          envVal?.updateValueAndValidity();

          const painadVal = aldGroup.get('dorPAINAD');
          painadVal?.clearValidators();
          painadVal?.setValue('', { emitEvent: false });
          painadVal?.updateValueAndValidity();

          const bpsVal = aldGroup.get('dorBPS');
          bpsVal?.clearValidators();
          bpsVal?.setValue('', { emitEvent: false });
          bpsVal?.updateValueAndValidity();
        }
      });

      aldGroup.get('dorUsouENV')?.valueChanges.subscribe(checked => {
        const ctrl = aldGroup.get('dorENV');
        if (checked && aldGroup.get('dor')?.value === 'sim') {
          ctrl?.setValidators([Validators.required, Validators.min(0), Validators.max(10), Validators.pattern(/^\d+$/)]);
        } else {
          ctrl?.clearValidators();
          ctrl?.setValue('');
        }
        ctrl?.updateValueAndValidity();
      });

      aldGroup.get('dorUsouPAINAD')?.valueChanges.subscribe(checked => {
        const ctrl = aldGroup.get('dorPAINAD');
        if (checked && aldGroup.get('dor')?.value === 'sim') {
          ctrl?.setValidators([Validators.required, Validators.min(0), Validators.max(10), Validators.pattern(/^\d+$/)]);
        } else {
          ctrl?.clearValidators();
          ctrl?.setValue('');
        }
        ctrl?.updateValueAndValidity();
      });

      aldGroup.get('dorUsouBPS')?.valueChanges.subscribe(checked => {
        const ctrl = aldGroup.get('dorBPS');
        if (checked && aldGroup.get('dor')?.value === 'sim') {
          ctrl?.setValidators([Validators.required, Validators.min(3), Validators.max(12), Validators.pattern(/^\d+$/)]);
        } else {
          ctrl?.clearValidators();
          ctrl?.setValue('');
        }
        ctrl?.updateValueAndValidity();
      });
    }
  }

  private syncConditionalValidators() {
    const atbGroup = this.form.get('antibiotico') as FormGroup;
    const tecGroup = this.form.get('tecnica') as FormGroup;
    const aldGroup = this.form.get('alderete') as FormGroup;

    if (atbGroup) {
      const val = atbGroup.get('temAntibiotico')?.value;
      const temRepiqueCtrl = atbGroup.get('temRepique');
      if (val === 'sim') {
        temRepiqueCtrl?.setValidators([Validators.required]);
      } else {
        temRepiqueCtrl?.clearValidators();
      }
      temRepiqueCtrl?.updateValueAndValidity();
    }

    if (tecGroup) {
      const be = tecGroup.get('bloqueiosEspinhais')?.value;
      const cateterCtrl = tecGroup.get('cateter');
      const opioideCtrl = tecGroup.get('opioide');
      if (be === 'sim') {
        cateterCtrl?.setValidators([Validators.required]);
        opioideCtrl?.setValidators([Validators.required]);
      } else {
        cateterCtrl?.clearValidators();
        opioideCtrl?.clearValidators();
      }
      cateterCtrl?.updateValueAndValidity();
      opioideCtrl?.updateValueAndValidity();

      const bp = tecGroup.get('bloqueioPlexo')?.value;
      const neuroCtrl = tecGroup.get('neuroestimulador');
      if (bp === 'sim') {
        neuroCtrl?.setValidators([Validators.required]);
      } else {
        neuroCtrl?.clearValidators();
      }
      neuroCtrl?.updateValueAndValidity();
    }

    if (aldGroup) {
      const isDorSim = aldGroup.get('dor')?.value === 'sim';
      
      const useEnv = aldGroup.get('dorUsouENV')?.value;
      const envCtrl = aldGroup.get('dorENV');
      if (isDorSim && useEnv) {
        envCtrl?.setValidators([Validators.required, Validators.min(0), Validators.max(10), Validators.pattern(/^\d+$/)]);
      } else {
        envCtrl?.clearValidators();
      }
      envCtrl?.updateValueAndValidity();

      const usePainad = aldGroup.get('dorUsouPAINAD')?.value;
      const painadCtrl = aldGroup.get('dorPAINAD');
      if (isDorSim && usePainad) {
        painadCtrl?.setValidators([Validators.required, Validators.min(0), Validators.max(10), Validators.pattern(/^\d+$/)]);
      } else {
        painadCtrl?.clearValidators();
      }
      painadCtrl?.updateValueAndValidity();

      const useBps = aldGroup.get('dorUsouBPS')?.value;
      const bpsCtrl = aldGroup.get('dorBPS');
      if (isDorSim && useBps) {
        bpsCtrl?.setValidators([Validators.required, Validators.min(3), Validators.max(12), Validators.pattern(/^\d+$/)]);
      } else {
        bpsCtrl?.clearValidators();
      }
      bpsCtrl?.updateValueAndValidity();
    }
  }

  getInvalidControlsNames(): string[] {
    const invalidFields: string[] = [];
    
    // Mapeamento de chaves do formulário para nomes amigáveis em português
    const fieldNamesMap: { [key: string]: string } = {
      // Segurança do Paciente
      'seguranca.identificadoAvaliado': 'Segurança: Identificado e avaliado',
      'seguranca.consentimentoAssinado': 'Segurança: Consentimento assinado',
      'seguranca.equipamentosChecados': 'Segurança: Equipamentos checados',
      
      // Pré-Indução
      'preInducao.recebeuMedPrevia': 'Pré-Indução: Medicação prévia',
      
      // Antibiótico
      'antibiotico.temAntibiotico': 'Antibiótico: Fez uso',
      'antibiotico.temRepique': 'Antibiótico: Opção de repique',
      
      // Dados Vitais
      'dadosVitais.pa': 'Dados Vitais: PA',
      'dadosVitais.fr': 'Dados Vitais: FR',
      'dadosVitais.temp': 'Dados Vitais: Temp',
      'dadosVitais.spo2': 'Dados Vitais: SpO2',
      'dadosVitais.peso': 'Dados Vitais: Peso',
      'dadosVitais.asa': 'Dados Vitais: ASA',
      'dadosVitais.entradaSala': 'Dados Vitais: Entrada na sala',
      
      // Equipe
      'equipe.cirurgiao': 'Equipe: Cirurgião',
      'equipe.assistente': 'Equipe: Assistente',
      'equipe.diagnosticoPre': 'Equipe: Diagnóstico pré-operatório',
      'equipe.horaInicioAnestesia': 'Equipe: Hora início da anestesia',
      
      // Posição
      'posicao.usoCoxim': 'Posição: Uso de coxins',
      'posicao.dificuldadePuncao': 'Posição: Dificuldade de punção',
      
      // Técnica Anestésica
      'tecnica.anestesiaGeral': 'Técnica: Anestesia Geral',
      'tecnica.circuitoAbsorvedor': 'Técnica: Circuito absorvedor',
      'tecnica.bloqueiosEspinhais': 'Técnica: Bloqueios espinhais realizados',
      'tecnica.cateter': 'Técnica: Cateter espinhal',
      'tecnica.opioide': 'Técnica: Opióide espinhal',
      'tecnica.sedacao': 'Técnica: Sedação',
      'tecnica.suplementacaoO2': 'Técnica: Suplementação de O2',
      'tecnica.bloqueioPlexo': 'Técnica: Bloqueio plexo',
      'tecnica.neuroestimulador': 'Técnica: Neuroestimulador',
      
      // Pós-Procedimento
      'posProcedimento.cirurgiaRealizada': 'Pós-Procedimento: Cirurgia realizada',
      'posProcedimento.horaTerminoCirurgia': 'Pós-Procedimento: Hora término da cirurgia',
      'posProcedimento.diagnosticoPos': 'Pós-Procedimento: Diagnóstico pós-operatório',
      'posProcedimento.horaTerminoAnestesia': 'Pós-Procedimento: Hora término da anestesia',
      
      // Alderete
      'alderete.consciencia': 'Alderete: Consciência',
      'alderete.atividade': 'Alderete: Atividade',
      'alderete.circulacao': 'Alderete: Circulação',
      'alderete.respiracao': 'Alderete: Respiração',
      'alderete.saturacao': 'Alderete: SpO2',
      'alderete.destino': 'Alderete: Destino',
      'alderete.dor': 'Alderete: Presença de dor',
      'alderete.dorENV': 'Alderete: Valor ENV (0 a 10)',
      'alderete.dorPAINAD': 'Alderete: Valor PAINAD (0 a 10)',
      'alderete.dorBPS': 'Alderete: Valor BPS (3 a 12)',
      
      // Assinaturas
      'assinaturas.primeiroAnestesista': 'Assinaturas: 1º Anestesista',
      'assinaturas.dataAssinatura': 'Assinaturas: Data'
    };

    const checkControls = (group: FormGroup, prefix = '') => {
      Object.keys(group.controls).forEach(key => {
        const control = group.controls[key];
        const path = prefix ? `${prefix}.${key}` : key;
        
        if (control instanceof FormGroup) {
          checkControls(control, path);
        } else if (control.invalid) {
          const friendlyName = fieldNamesMap[path] || path;
          invalidFields.push(friendlyName);
        }
      });
    };

    checkControls(this.form);
    return invalidFields;
  }

  get aldereteTotal(): number {
    const aldereteGroup = this.form.get('alderete') as FormGroup;
    if (!aldereteGroup) return 0;
    const controls = ['consciencia', 'atividade', 'circulacao', 'respiracao', 'saturacao'];
    return controls.reduce((total, key) => {
      const val = aldereteGroup.get(key)?.value;
      return total + (val ? parseInt(val) : 0);
    }, 0);
  }

  get aldereteStatus(): { text: string, color: string } {
    const score = this.aldereteTotal;
    if (score >= 8) return { text: 'Apto para Alta', color: '#10b981' };
    if (score >= 5) return { text: 'Em Observação', color: '#f59e0b' };
    return { text: 'Crítico / Monitoramento Intenso', color: '#ef4444' };
  }

  // [FA-043] Helper para subcomponentes receberem FormGroups tipados
  getFormGroup(name: string): FormGroup {
    return this.form.get(name) as FormGroup;
  }

  isSectionInvalid(name: string): boolean {
    const group = this.form.get(name);
    return !!(group && group.invalid && (group.touched || this.showValidationErrors));
  }

  private loadPatientData(id: string) {
    this.isLoading = true;
    this.surgeryService.getSurgeries('2026-04-11').subscribe((res: any) => {
      const dataArray = res?.data?.data || res?.data || [];
      const surgeryData = dataArray.find((s: any) => (s.surgeryId || s.id)?.toString() === id.toString());

      if (surgeryData) {
        const patientWeight = surgeryData.weightKg || '92';

        this.patient = {
          ...surgeryData,
          gender: surgeryData.gender || 'M',
          weight: patientWeight.toString().replace(' kg', ''),
          birthDate: this.formatDate(surgeryData.birthDate || '1985-03-15T00:00:00')
        };

        this.selectedSurgery = { ...surgeryData, id: surgeryData.surgeryId || surgeryData.id };
        this.selectedProcedure = this.selectedSurgery.procedures?.find((p: any) => p.isPrimary) || this.selectedSurgery.procedures?.[0];

        // [FA-042] Lógica de Auto-Save Draft PRIORITÁRIA
        const draft = this.anesthesiaService.getDraft(this.pacienteId!);

        this.anesthesiaService.getLatestByPatient(this.pacienteId!).subscribe(savedRecord => {
          if (draft) {
            console.log('Rascunho (Auto-Save) encontrado e carregado:', draft);
            this.form.patchValue(draft);
            if (draft.antibioticsList) {
              this.antibioticsList = draft.antibioticsList;
            }
          } else if (savedRecord) {
            console.log('Ficha oficial encontrada e carregada:', savedRecord);
            this.form.patchValue(savedRecord);
            if ((savedRecord as any).antibioticsList) {
              this.antibioticsList = (savedRecord as any).antibioticsList;
            }
          } else {
            console.log('Nenhuma ficha ou rascunho encontrado.');
            this.form.get('dadosVitais.peso')?.patchValue(this.patient.weight);
          }

          this.syncConditionalValidators();
          this.isLoading = false;
          this.startAutoSave(); // Inicia monitoramento após carregar
        });
      } else {
        this.isLoading = false;
      }
    });
  }

  private startAutoSave() {
    this.autoSaveSub = this.form.valueChanges
      .pipe(debounceTime(1500)) // Espera 1.5s após a última mudança
      .subscribe(value => {
        if (!this.isSaving) {
          const draftData = {
            ...value,
            antibioticsList: this.antibioticsList
          };
          this.anesthesiaService.saveDraft(this.pacienteId!, draftData);
          console.log('Rascunho com antibióticos salvo automaticamente...');
        }
      });
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  async confirmarLimpeza() {
    const alert = await this.alertController.create({
      header: 'Limpar Formulário?',
      message: 'Isso apagará todos os campos preenchidos. Deseja continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Limpar',
          cssClass: 'alert-button-danger',
          handler: () => {
            this.anesthesiaService.clearLatestRecord(this.pacienteId!).subscribe(async () => {
              this.form.reset();
              this.antibioticsList = []; // Limpa a lista de antibióticos
              // Re-seta o estado inicial padrão conforme initForm
              this.initForm();

              if (this.patient) {
                this.form.get('dadosVitais.peso')?.patchValue(this.patient.weight);
              }

              const toast = await this.toastController.create({
                message: 'Ficha limpa com sucesso. Os dados salvos foram removidos.',
                duration: 2000,
                color: 'success',
                position: 'top'
              });
              await toast.present();

              // Redireciona para o topo da página com scroll suave (setTimeout garante renderização pós-reset)
              setTimeout(() => {
                const content = document.querySelector('.main-content');
                if (content) {
                  content.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }, 150);
            });
          }
        }
      ]
    });
    await alert.present();
  }

  imprimir() {
    console.log('Solicitando PDF da API...');
    if (this.selectedSurgery?.id) {
        window.open(this.anesthesiaService.getPdfUrl(this.selectedSurgery.id), '_blank');
    }
  }

  async salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showValidationErrors = true;
      
      // Remove a classe após a animação para poder repetir se necessário
      setTimeout(() => this.showValidationErrors = false, 1000);

      const aldGroup = this.form.get('alderete');
      const isEnvInvalid = aldGroup?.get('dorENV')?.invalid;
      const isPainadInvalid = aldGroup?.get('dorPAINAD')?.invalid;
      const isBpsInvalid = aldGroup?.get('dorBPS')?.invalid;

      if (isEnvInvalid || isPainadInvalid || isBpsInvalid) {
        let msg = 'Valores de escala de dor inválidos. ';
        if (isEnvInvalid) msg += 'ENV (0 a 10). ';
        if (isPainadInvalid) msg += 'PAINAD (0 a 10). ';
        if (isBpsInvalid) msg += 'BPS (3 a 12).';
        
        const toast = await this.toastController.create({
          message: msg,
          duration: 4000,
          color: 'warning',
          position: 'top'
        });
        await toast.present();
        return;
      }

      const toast = await this.toastController.create({
        message: 'Preencha os campos obrigatórios (*).',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.isSaving = true;

    const record: AnesthesiaRecordModel = {
      ...this.form.value,
      pacienteId: this.pacienteId,
      antibioticsList: this.antibioticsList
    } as any;

    this.anesthesiaService.saveRecord(record).subscribe(async (res) => {
      this.anesthesiaService.clearDraft(this.pacienteId!); // Limpa rascunho após salvar oficial
      this.isSaving = false;
      const toast = await this.toastController.create({
        message: 'Ficha Anestésica salva com sucesso!',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    }, async (error) => {
      this.isSaving = false;
      const toast = await this.toastController.create({
        message: 'Erro ao salvar ficha. Tente novamente.',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    });
  }

  voltar() {
    this.location.back();
  }

  async abrirModalAntibiotico() {
    const alert = await this.alertController.create({
      header: 'Novo Antibiótico',
      inputs: [
        { name: 'nome', type: 'text', placeholder: 'Nome do Antibiótico' },
        { name: 'dose', type: 'text', placeholder: 'Dose (ex: 2g)' },
        { name: 'via', type: 'text', placeholder: 'Via (ex: IV, IM, VO)' },
        { name: 'hora', type: 'time' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Adicionar', handler: (data) => {
            if (data.nome && data.dose) {
              this.antibioticsList.push({
                nome: data.nome,
                dose: data.dose,
                via: data.via || 'IV',
                hora: data.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                temRepique: 'nao', // Padrão inicial
                repiques: []
              });
              this.anesthesiaService.saveDraft(this.pacienteId!, { ...this.form.value, antibioticsList: this.antibioticsList });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async adicionarRepique(atbIndex: number) {
    const alert = await this.alertController.create({
      header: 'Novo Repique',
      subHeader: `Para: ${this.antibioticsList[atbIndex].nome}`,
      inputs: [
        { name: 'dose', type: 'text', placeholder: 'Dose do Repique' },
        { name: 'hora', type: 'time' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Adicionar', handler: (data) => {
            if (data.dose) {
              this.antibioticsList[atbIndex].repiques.push({
                dose: data.dose,
                hora: data.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
              this.anesthesiaService.saveDraft(this.pacienteId!, { ...this.form.value, antibioticsList: this.antibioticsList });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async editarAntibiotico(index: number) {
    const atb = this.antibioticsList[index];
    const alert = await this.alertController.create({
      header: 'Editar Antibiótico',
      inputs: [
        { name: 'nome', type: 'text', value: atb.nome, placeholder: 'Nome' },
        { name: 'dose', type: 'text', value: atb.dose, placeholder: 'Dose' },
        { name: 'via', type: 'text', value: atb.via, placeholder: 'Via' },
        { name: 'hora', type: 'time', value: atb.hora }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar', handler: (data) => {
            if (data.nome && data.dose) {
              this.antibioticsList[index].nome = data.nome;
              this.antibioticsList[index].dose = data.dose;
              this.antibioticsList[index].via = data.via;
              this.antibioticsList[index].hora = data.hora;
              this.anesthesiaService.saveDraft(this.pacienteId!, { ...this.form.value, antibioticsList: this.antibioticsList });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async editarRepique(atbIndex: number, repiqueIndex: number) {
    const rep = this.antibioticsList[atbIndex].repiques[repiqueIndex];
    const alert = await this.alertController.create({
      header: 'Editar Repique',
      inputs: [
        { name: 'dose', type: 'text', value: rep.dose, placeholder: 'Dose' },
        { name: 'hora', type: 'time', value: rep.hora }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar', handler: (data) => {
            if (data.dose) {
              this.antibioticsList[atbIndex].repiques[repiqueIndex].dose = data.dose;
              this.antibioticsList[atbIndex].repiques[repiqueIndex].hora = data.hora;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  toggleRepique(index: number, value: string) {
    this.antibioticsList[index].temRepique = value;
    if (value === 'sim' && this.antibioticsList[index].repiques.length === 0) {
      this.adicionarRepique(index);
    } else if (value === 'nao') {
      this.antibioticsList[index].repiques = []; // Limpa os repiques se marcar NÃO
    }
    this.anesthesiaService.saveDraft(this.pacienteId!, { ...this.form.value, antibioticsList: this.antibioticsList });
  }

  removerAntibiotico(index: number) {
    this.antibioticsList.splice(index, 1);
    this.anesthesiaService.saveDraft(this.pacienteId!, { ...this.form.value, antibioticsList: this.antibioticsList });
  }

  removerRepique(atbIndex: number, repiqueIndex: number) {
    this.antibioticsList[atbIndex].repiques.splice(repiqueIndex, 1);
    this.anesthesiaService.saveDraft(this.pacienteId!, { ...this.form.value, antibioticsList: this.antibioticsList });
  }
}
