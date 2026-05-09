import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Shared Components
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { PatientInfoCardComponent } from '../../shared/components/patient-info-card/patient-info-card.component';
import { FormSectionComponent } from '../../shared/components/form-section/form-section.component';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { RadioGroupComponent } from '../../shared/components/radio-group/radio-group.component';
import { CheckboxGroupComponent } from '../../shared/components/checkbox-group/checkbox-group.component';

// Services
import { SurgeryService } from '../../core/services/surgery.service';

@Component({
  selector: 'app-ficha-anestesica',
  standalone: true,
  imports: [
    CommonModule, 
    IonicModule, 
    ReactiveFormsModule,
    StatusBarComponent,
    HeaderInstitucionalComponent,
    PatientInfoCardComponent,
    FormSectionComponent,
    FormFieldComponent,
    CheckboxGroupComponent
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

  // Opções para os campos
  medPreviaOptions = [
    { label: 'Midazolam', value: 'midazolam' },
    { label: 'Diazepam', value: 'diazepam' },
    { label: 'Meperidina', value: 'meperidina' },
    { label: 'Outras', value: 'outras' }
  ];

  posicaoOptions = [
    { label: 'Supina', value: 'supina' },
    { label: 'Prona', value: 'prona' },
    { label: 'Lateral Direita', value: 'lateral_dir' },
    { label: 'Lateral Esquerda', value: 'lateral_esq' },
    { label: 'Litotômica', value: 'litotomica' },
    { label: 'Trendelenburg', value: 'trendelenburg' }
  ];

  acessoVenosoOptions = [
    { label: 'Membro Superior Direito', value: 'msd' },
    { label: 'Membro Superior Esquerdo', value: 'mse' },
    { label: 'Jugular Interna', value: 'jugular' },
    { label: 'Subclávia', value: 'subclavia' },
    { label: 'Dissecção', value: 'disseccao' }
  ];

  respiracaoOptions = [
    { label: 'Espontânea', value: 'espontanea' },
    { label: 'Assistida', value: 'assistida' },
    { label: 'Controlada Mecânica', value: 'controlada_mec' },
    { label: 'Controlada Manual', value: 'controlada_man' }
  ];

  suplementacaoO2Options = [
    { label: 'Cateter Nasal', value: 'cateter_nasal' },
    { label: 'Máscara Facial', value: 'mascara_facial' },
    { label: 'Guedel', value: 'guedel' },
    { label: 'Nasofaringe', value: 'nasofaringe' },
    { label: 'Outros', value: 'outros' }
  ];

  viaAereaOptions = [
    { label: 'Máscara Laríngea', value: 'mascara_laringea' },
    { label: 'Tubo Orotraqueal', value: 'tot' },
    { label: 'Tubo Nasotraqueal', value: 'tnt' },
    { label: 'Cânula Aramada', value: 'aramada' },
    { label: 'Fribrobroncoscopia', value: 'fibo' }
  ];

  nivelPuncaoOptions = [
    { label: 'Cervical', value: 'cervical' },
    { label: 'Torácica', value: 'toracica' },
    { label: 'Lombar', value: 'lombar' },
    { label: 'Sacral', value: 'sacral' }
  ];

  nervoOptions = [
    { label: 'Femoral', value: 'femoral' },
    { label: 'Ciático', value: 'ciatico' },
    { label: 'Iliohipogástrico', value: 'iliohipogastrico' },
    { label: 'Ilioinguinal', value: 'ilioinguinal' },
    { label: 'Retrobulbar', value: 'retrobulbar' },
    { label: 'Peribulbar', value: 'peribulbar' }
  ];

  destinoOptions = [
    { label: 'RPA', value: 'rpa' },
    { label: 'Quarto', value: 'quarto' },
    { label: 'CTI', value: 'cti' },
    { label: 'Dayclinic', value: 'dayclinic' },
    { label: 'Alta', value: 'alta' }
  ];

  yesNoOptions = [{ label: 'Não', value: 'nao' }, { label: 'Sim', value: 'sim' }];

  // Campos de Alderete
  aldereteFields = [
    { label: 'Atividade Motora', control: 'atividade', options: [
        { score: 2, text: 'Move 4 extremidades' },
        { score: 1, text: 'Move 2 extremidades' },
        { score: 0, text: 'Incapaz de mover' }
    ]},
    { label: 'Respiração', control: 'respiracao', options: [
        { score: 2, text: 'Capaz de respirar e tossir' },
        { score: 1, text: 'Dispneia ou respiração limitada' },
        { score: 0, text: 'Apneia' }
    ]},
    { label: 'Circulação (PA)', control: 'circulacao', options: [
        { score: 2, text: 'PA +/- 20% do pré-anestésico' },
        { score: 1, text: 'PA +/- 20-50% do pré-anestésico' },
        { score: 0, text: 'PA +/- 50% do pré-anestésico' }
    ]},
    { label: 'Consciência', control: 'consciencia', options: [
        { score: 2, text: 'Lúcido e orientado' },
        { score: 1, text: 'Desperta se chamado' },
        { score: 0, text: 'Não responde' }
    ]},
    { label: 'Saturação de O2', control: 'saturacao', options: [
        { score: 2, text: 'Mantém SatO2 > 92% em ar ambiente' },
        { score: 1, text: 'Necessita O2 para SatO2 > 90%' },
        { score: 0, text: 'SatO2 < 90% even with O2' }
    ]}
  ];

  antibioticsList: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private surgeryService: SurgeryService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.pacienteId = this.route.snapshot.paramMap.get('id');
    if (this.pacienteId) {
      this.loadPatientData(this.pacienteId);
    }
    
    this.setupConditionalLogic();
  }

  private initForm() {
    this.form = this.fb.group({
      seguranca: this.fb.group({
        identificacaoConfirmada: [false, Validators.requiredTrue],
        sitioCirurgicoMarcado: [false],
        consentimentoAssinado: [false, Validators.requiredTrue],
        equipamentosTestados: [false, Validators.requiredTrue],
        riscoViaAereaDificil: ['nao', Validators.required],
        riscoPerdaSanguinea: ['nao', Validators.required]
      }),

      equipe: this.fb.group({
        anestesistaResponsavel: ['', Validators.required],
        residente: [''],
        cirurgiao: ['', Validators.required],
        enfermeiro: ['']
      }),

      dadosVitais: this.fb.group({
        paSistolica: [null, [Validators.required, Validators.min(30), Validators.max(300)]],
        paDiastolica: [null, [Validators.required, Validators.min(20), Validators.max(200)]],
        fc: [null, [Validators.required, Validators.min(20), Validators.max(250)]],
        spo2: [null, [Validators.required, Validators.min(50), Validators.max(100)]],
        temperatura: [null]
      }),

      preInducao: this.fb.group({
        recebeuMedPrevia: ['nao', Validators.required],
        medicacoesPrevias: [[]],
        outraMedPrevia: ['']
      }),

      antibiotico: this.fb.group({
        temAntibiotico: ['nao', Validators.required]
      }),

      tecnica: this.fb.group({
        posicoesOperatorias: [[], Validators.required],
        usoCoxim: ['nao', Validators.required],
        localCoxim: [''],
        acessosVenoso: [[], Validators.required],
        respiracao: [[], Validators.required],
        suplementacaoO2: [[]],
        outraSuplementacaoO2: [''],
        viaAerea: [[], Validators.required],
        canulaNumero: [''],
        cuff: [''],
        lamina: [''],
        sedacao: ['nao'],
        bloqueioPlexo: ['nao'],
        neuroestimulador: ['nao'],
        nervosEstimulados: [[]],
        temBloqueioEspinhal: ['nao'],
        nivelPuncao: [[]],
        posicaoPuncao: [[]],
        usoCateter: ['nao'],
        usoOpioide: ['nao'],
        numeroPuncoes: [null]
      }),

      alderete: this.fb.group({
        atividade: ['', Validators.required],
        respiracao: ['', Validators.required],
        circulacao: ['', Validators.required],
        consciencia: ['', Validators.required],
        saturacao: ['', Validators.required]
      }),

      posProcedimento: this.fb.group({
        temDor: ['nao', Validators.required],
        dorENV: [null],
        dorPAINAD: [null],
        dorBPS: [null],
        dorConduta: [''],
        destino: ['', Validators.required]
      }),

      assinaturas: this.fb.group({
        primeiroAnestesista: ['', Validators.required],
        segundoAnestesista: [''],
        dataAssinatura: [new Date().toISOString().split('T')[0], Validators.required]
      })
    });
  }

  private setupConditionalLogic() {
    const preInducao = this.form.get('preInducao');
    preInducao?.get('recebeuMedPrevia')?.valueChanges.subscribe(val => {
      const ctrl = preInducao.get('medicacoesPrevias');
      if (val === 'sim') ctrl?.setValidators(Validators.required);
      else ctrl?.clearValidators();
      ctrl?.updateValueAndValidity();
    });

    const tecnica = this.form.get('tecnica');
    tecnica?.get('usoCoxim')?.valueChanges.subscribe(val => {
      const ctrl = tecnica.get('localCoxim');
      if (val === 'sim') ctrl?.setValidators(Validators.required);
      else ctrl?.clearValidators();
      ctrl?.updateValueAndValidity();
    });
  }

  get isOtherMedSelected(): boolean {
    return this.form.get('preInducao.medicacoesPrevias')?.value?.includes('outras');
  }

  get isOtherO2Selected(): boolean {
    return this.form.get('tecnica.suplementacaoO2')?.value?.includes('outros');
  }

  get aldereteTotal(): number {
    const aldereteGroup = this.form.get('alderete') as FormGroup;
    if (!aldereteGroup) return 0;
    
    return Object.values(aldereteGroup.controls).reduce((total, ctrl) => {
      return total + (ctrl.value ? parseInt(ctrl.value) : 0);
    }, 0);
  }

  private loadPatientData(id: string) {
    this.surgeryService.getSurgeries('2026-04-21').subscribe(res => {
      const patientData = res.data.find(p => p.surgeries.some(s => s.id === parseInt(id)));
      if (patientData) {
        this.patient = patientData;
        this.selectedSurgery = patientData.surgeries.find(s => s.id === parseInt(id));
        this.selectedProcedure = this.selectedSurgery.procedures.find((p: any) => p.isPrimary) || this.selectedSurgery.procedures[0];
      }
    });
  }

  async abrirModalAntibiotico() {
    const alert = await this.alertController.create({
      header: 'Novo Antibiótico',
      inputs: [
        { name: 'nome', type: 'text', placeholder: 'Nome do ATB' },
        { name: 'dose', type: 'text', placeholder: 'Dose' },
        { name: 'hora', type: 'time' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Adicionar', handler: (data) => {
            if (data.nome && data.dose && data.hora) {
                this.antibioticsList.push(data);
                return true;
            }
            return false;
        }}
      ]
    });
    await alert.present();
  }

  adicionarRepique() {
    if (this.antibioticsList.length === 0) return;
    const last = this.antibioticsList[this.antibioticsList.length - 1];
    this.antibioticsList.push({
      nome: `${last.nome} (Repique)`,
      dose: last.dose,
      hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    });
  }

  removerAntibiotico(index: number) {
    this.antibioticsList.splice(index, 1);
  }

  async confirmarLimpeza() {
    const alert = await this.alertController.create({
      header: 'Limpar Ficha?',
      buttons: [
        { text: 'Não', role: 'cancel' },
        { text: 'Sim, Limpar', handler: () => this.form.reset() }
      ]
    });
    await alert.present();
  }

  async salvar() {
    console.log('Tentando salvar formulário...', this.form.value);
    if (this.form.invalid) {
      const toast = await this.toastController.create({
        message: 'Preencha todos os campos obrigatórios.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
      return;
    }
    this.router.navigate(['/registro-cirurgia', this.pacienteId]);
  }

  imprimir() {
    window.print();
  }

  voltar() {
    this.router.navigate(['/pacientes']);
  }
}
