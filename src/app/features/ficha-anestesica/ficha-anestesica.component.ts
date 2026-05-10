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
    RadioGroupComponent,
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
    { label: 'Fribrobroncoscopia', value: 'fibro' }
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
    { label: 'Atividade Motora', control: 'aldereteAtividade', options: [
        { score: 2, text: 'Move 4 extremidades' },
        { score: 1, text: 'Move 2 extremidades' },
        { score: 0, text: 'Incapaz de mover' }
    ]},
    { label: 'Respiração', control: 'aldereteRespiracao', options: [
        { score: 2, text: 'Capaz de respirar e tossir' },
        { score: 1, text: 'Dispneia ou respiração limitada' },
        { score: 0, text: 'Apneia' }
    ]},
    { label: 'Circulação (PA)', control: 'aldereteCirculacao', options: [
        { score: 2, text: 'PA +/- 20% do pré-anestésico' },
        { score: 1, text: 'PA +/- 20-50% do pré-anestésico' },
        { score: 0, text: 'PA +/- 50% do pré-anestésico' }
    ]},
    { label: 'Consciência', control: 'aldereteConsciencia', options: [
        { score: 2, text: 'Lúcido e orientado' },
        { score: 1, text: 'Desperta se chamado' },
        { score: 0, text: 'Não responde' }
    ]},
    { label: 'Saturação de O2', control: 'aldereteSaturacao', options: [
        { score: 2, text: 'Mantém SatO2 > 92% em ar ambiente' },
        { score: 1, text: 'Necessita O2 para SatO2 > 90%' },
        { score: 0, text: 'SatO2 < 90% mesmo com O2' }
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
    
    // Observar mudanças para lógica condicional de obrigatoriedade
    this.setupConditionalLogic();
  }

  private initForm() {
    this.form = this.fb.group({
      recebeuMedPrevia: ['nao', Validators.required],
      medicacoesPrevias: [[]],
      outraMedPrevia: [''],
      
      temAntibiotico: ['nao', Validators.required],
      
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
      numeroPuncoes: [null],
      
      aldereteAtividade: ['', Validators.required],
      aldereteRespiracao: ['', Validators.required],
      aldereteCirculacao: ['', Validators.required],
      aldereteConsciencia: ['', Validators.required],
      aldereteSaturacao: ['', Validators.required],
      
      temDor: ['nao', Validators.required],
      dorENV: [null],
      dorPAINAD: [null],
      dorBPS: [null],
      dorConduta: [''],
      
      destino: ['', Validators.required]
    });
  }

  private setupConditionalLogic() {
    // Escutar mudanças no formulário para ajustar obrigatoriedade dinamicamente
    this.form.get('recebeuMedPrevia')?.valueChanges.subscribe(val => {
      const ctrl = this.form.get('medicacoesPrevias');
      if (val === 'sim') ctrl?.setValidators(Validators.required);
      else ctrl?.clearValidators();
      ctrl?.updateValueAndValidity();
    });

    this.form.get('usoCoxim')?.valueChanges.subscribe(val => {
      const ctrl = this.form.get('localCoxim');
      if (val === 'sim') ctrl?.setValidators(Validators.required);
      else ctrl?.clearValidators();
      ctrl?.updateValueAndValidity();
    });
  }

  get isOtherMedSelected(): boolean {
    return this.form.get('medicacoesPrevias')?.value?.includes('outras');
  }

  get isOtherO2Selected(): boolean {
    return this.form.get('suplementacaoO2')?.value?.includes('outros');
  }

  get aldereteTotal(): number {
    const fields = [
      'aldereteAtividade', 'aldereteRespiracao', 'aldereteCirculacao', 
      'aldereteConsciencia', 'aldereteSaturacao'
    ];
    return fields.reduce((total, field) => {
      const val = this.form.get(field)?.value;
      return total + (val ? parseInt(val) : 0);
    }, 0);
  }

  private loadPatientData(id: string) {
    // No MVP, buscamos da lista que já temos ou simulamos a busca detalhada
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
        { name: 'nome', type: 'text', placeholder: 'Nome do ATB (ex: Cefazolina)' },
        { name: 'dose', type: 'text', placeholder: 'Dose (ex: 2g)' },
        { name: 'hora', type: 'time', value: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
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
      message: 'Esta ação apagará todos os dados digitados. Confirma?',
      buttons: [
        { text: 'Não', role: 'cancel' },
        { text: 'Sim, Limpar', handler: () => this.form.reset({recebeuMedPrevia: 'nao', temAntibiotico: 'nao', usoCoxim: 'nao'}) }
      ]
    });
    await alert.present();
  }

  async largarCaso() {
    const alert = await this.alertController.create({
      header: 'Largar Caso?',
      message: 'Você deixará de ser o responsável por este paciente. Outro médico poderá assumir.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', handler: () => this.voltar() }
      ]
    });
    await alert.present();
  }

  async salvar() {
    if (this.form.invalid) {
      const toast = await this.toastController.create({
        message: 'Por favor, preencha todos os campos obrigatórios em destaque.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
      return;
    }

    // Navegar para o transoperatório (próxima fase)
    this.router.navigate(['/registro-cirurgia', this.pacienteId]);
  }

  voltar() {
    this.router.navigate(['/pacientes']);
  }
}
