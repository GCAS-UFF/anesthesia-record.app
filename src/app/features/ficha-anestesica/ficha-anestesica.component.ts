import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  addOutline
} from 'ionicons/icons';

// Shared Components
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { PatientInfoCardComponent } from '../../shared/components/patient-info-card/patient-info-card.component';
import { FormSectionComponent } from '../../shared/components/form-section/form-section.component';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { RadioGroupComponent } from '../../shared/components/radio-group/radio-group.component';
import { CheckboxGroupComponent } from '../../shared/components/checkbox-group/checkbox-group.component';

// Services
import { SurgeryService } from 'src/app/core/services/surgery.service';
import { AnesthesiaRecordService } from 'src/app/core/services/anesthesia-record.service';
import { AnesthesiaRecordModel } from 'src/app/shared/models/anesthesia-record.model';

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
    { label: 'LITOTÔMICA', value: 'LITOTÔMICA' },
    { label: 'OUTRA', value: 'Outra' }
  ];

  acessoVenosoOptions = [
    { label: 'Periférico', value: 'Periferico' },
    { label: 'Central', value: 'Central' },
    { label: 'Outro', value: 'Outro' }
  ];

  assistidaOptions = [
    { label: 'Espontânea', value: 'Espontanea' },
    { label: 'Manual', value: 'Manual' }
  ];

  controladaOptions = [
    { label: 'Volume', value: 'Volume' },
    { label: 'Pressão', value: 'Pressao' }
  ];

  suplementacaoO2Options = [
    { label: 'Cateter nasal', value: 'Cateter nasal' },
    { label: 'Máscara facial', value: 'Mascara facial' },
    { label: 'Guedel', value: 'Guedel' },
    { label: 'Nasofaringe', value: 'Nasofaringe' },
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
    { label: 'Intubado', value: 'Intubado' },
    { label: 'Outras', value: 'Outras' }
  ];

  destinoOptions = [
    { label: 'RPA', value: 'RPA' },
    { label: 'Quarto', value: 'Quarto' },
    { label: 'CTI', value: 'CTI' },
    { label: 'Dayclinic', value: 'Dayclinic' },
    { label: 'Alta', value: 'Alta' }
  ];

  yesNoOptions = [{ label: 'Não', value: 'nao' }, { label: 'Sim', value: 'sim' }];

  aldereteFields = [
    { label: 'Consciência', control: 'consciencia', options: [
        { score: 2, text: 'Totalmente desperto' },
        { score: 1, text: 'Desperta quando chamado' },
        { score: 0, text: 'Não responde' }
    ]},
    { label: 'Atividade', control: 'atividade', options: [
        { score: 2, text: 'Movimento de todas extremidades' },
        { score: 1, text: 'Movimento de duas extremidades' },
        { score: 0, text: 'Incapaz de se mover' }
    ]},
    { label: 'Circulação', control: 'circulacao', options: [
        { score: 2, text: 'PA +/- 20% do valor pré-anestésico' },
        { score: 1, text: 'PA de 20 a 50% do valor pré-anestésico' },
        { score: 0, text: 'PA +/- 50% do valor pré-anestésico' }
    ]},
    { label: 'Respiração', control: 'respiracao', options: [
        { score: 2, text: 'Respira profundamente e tosse' },
        { score: 1, text: 'Dispnéia, hipoventilação' },
        { score: 0, text: 'Apneia' }
    ]},
    { label: 'SpO2', control: 'saturacao', options: [
        { score: 2, text: 'Mantém SpO2 > 90% em ar ambiente' },
        { score: 1, text: 'Necessita de O2 para manter SpO2 > 90%' },
        { score: 0, text: 'SpO2 < 90% mesmo com O2 suplementar' }
    ]}
  ];

  antibioticsList: any[] = [];
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private surgeryService: SurgeryService,
    private anesthesiaService: AnesthesiaRecordService,
    private alertController: AlertController,
    private toastController: ToastController
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
      addOutline
    });
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
      // 1. Segurança do Paciente
      seguranca: this.fb.group({
        identificadoAvaliado: ['nao', Validators.required],
        consentimentoAssinado: ['nao', Validators.required],
        equipamentosChecados: ['nao', Validators.required],
        atencao: ['']
      }),

      // 2. Pré-Indução
      preInducao: this.fb.group({
        recebeuMedPrevia: ['nao', Validators.required],
        hora: [''],
        farmaco: [''],
        via: [''],
        outrasVia: ['']
      }),

      // 3. Antibiótico Profilático
      antibiotico: this.fb.group({
        temAntibiotico: ['nao', Validators.required],
        atbNome: [''],
        atbDose: [''],
        atbHora: [''],
        temRepique: ['nao'],
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
        assistente: [''],
        diagnosticoPre: ['', Validators.required],
        horaInicioAnestesia: ['', Validators.required]
      }),

      // 6. Posição Operatória
      posicao: this.fb.group({
        posicoes: [[]],
        outrasPosicao: [''],
        usoCoxim: ['nao'],
        localCoxim: [''],
        acessoVenoso: [[]],
        outroAcesso: [''],
        localAcesso: [''],
        dificuldadePuncao: ['nao']
      }),

      // 7. Técnica Anestésica
      tecnica: this.fb.group({
        anestesiaGeral: ['nao'],
        respiracaoAssistida: [[]],
        respiracaoControlada: [[]],
        circuitoAbsorvedor: ['nao'],
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
        bloqueiosEspinhais: ['nao'],
        nivelPuncao: [[]],
        posicaoPuncao: [''], // Sentada / Decúbito
        cateter: ['nao'],
        opioide: ['nao'],
        numeroPuncoes: [''],

        sedacao: ['nao'],
        suplementacaoO2: ['nao'],
        tipoSuplementacaoO2: [[]],
        suplementacaoO2Outros: [''],
        
        bloqueioPlexo: ['nao'],
        neuroestimulador: ['nao'],
        nervosEstimulados: [[]],
        nervosEstimuladosOutros: [''],
        tecnicasAuxiliares: [[]]
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
        consciencia: ['', Validators.required],
        atividade: ['', Validators.required],
        circulacao: ['', Validators.required],
        respiracao: ['', Validators.required],
        saturacao: ['', Validators.required],
        horaAvaliacao: [''],
        condicoesClinicasAlta: [[]],
        condicoesAltaOutras: [''],
        destino: ['', Validators.required],
        dor: ['nao'],
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
    // Implementar regras do card 41 conforme necessário
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

  get formProgress(): number {
    // Lista de campos críticos para medir o progresso
    const criticalFields = [
      'seguranca.identificadoAvaliado',
      'seguranca.consentimentoAssinado',
      'seguranca.equipamentosChecados',
      'dadosVitais.pa',
      'dadosVitais.peso',
      'dadosVitais.asa',
      'equipe.cirurgiao',
      'equipe.diagnosticoPre',
      'posicao.posicoes',
      'posProcedimento.cirurgiaRealizada',
      'alderete.consciencia'
    ];

    let filledCount = 0;
    criticalFields.forEach(path => {
      const val = this.form.get(path)?.value;
      if (val && (Array.isArray(val) ? val.length > 0 : val !== '')) {
        filledCount++;
      }
    });

    return Math.round((filledCount / criticalFields.length) * 100);
  }

  get formStatusText(): string {
    const progress = this.formProgress;
    if (progress === 0) return 'Ficha Não Iniciada';
    if (progress < 50) return 'Preenchimento Inicial';
    if (progress < 100) return 'Em Procedimento';
    return 'Ficha Completa';
  }

  private loadPatientData(id: string) {
    this.isLoading = true;
    this.surgeryService.getSurgeries('2026-04-21').subscribe(res => {
      const patientData = res.data.find(p => p.surgeries.some(s => s.id === parseInt(id)));
      if (patientData) {
        const patientWeight = patientData.weightKg || '92';
        
        this.patient = {
          ...patientData,
          gender: patientData.gender || 'M',
          weight: patientWeight.toString().replace(' kg', ''), 
          birthDate: this.formatDate(patientData.birthDate || '1985-03-15T00:00:00')
        };
        
        this.selectedSurgery = patientData.surgeries.find(s => s.id === parseInt(id));
        this.selectedProcedure = this.selectedSurgery.procedures.find((p: any) => p.isPrimary) || this.selectedSurgery.procedures[0];

        // [FA-042] Verifica se já existe uma ficha salva para este paciente para pré-carregar
        this.anesthesiaService.getLatestByPatient(this.pacienteId!).subscribe(savedRecord => {
          if (savedRecord) {
            console.log('Ficha anterior encontrada, carregando dados...');
            this.form.patchValue(savedRecord);
          } else {
            // Se não tiver ficha salva, auto-preenche apenas o peso
            this.form.get('dadosVitais.peso')?.patchValue(this.patient.weight);
          }
          this.isLoading = false;
        });
      } else {
        this.isLoading = false;
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
            this.form.reset();
            // Re-seta o peso inicial
            if (this.patient) {
              this.form.get('dadosVitais.peso')?.patchValue(this.patient.weight);
            }
          } 
        }
      ]
    });
    await alert.present();
  }

  imprimir() {
    console.log('Preparando para imprimir...');
    window.print();
  }

  async salvar() {
    if (this.form.invalid) {
      const toast = await this.toastController.create({
        message: 'Por favor, preencha todos os campos obrigatórios (*) da ficha.',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const loading = await this.alertController.create({
      message: 'Salvando Ficha Anestésica...'
    });
    // Simulação de loading (em app real usaria LoadingController)
    
    const record: AnesthesiaRecordModel = {
      ...this.form.value,
      pacienteId: this.pacienteId
    };

    this.anesthesiaService.saveRecord(record).subscribe(async (res) => {
      const toast = await this.toastController.create({
        message: 'Ficha Anestésica salva com sucesso!',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      
      // Opcional: Navegar de volta ou para a lista
      // this.router.navigate(['/pacientes']);
    }, async (error) => {
      const toast = await this.toastController.create({
        message: 'Erro ao salvar ficha. Tente novamente.',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    });
  }

  voltar() {
    this.router.navigate(['/pacientes']);
  }

  async abrirModalAntibiotico() {
    const alert = await this.alertController.create({
      header: 'Novo Antibiótico',
      inputs: [
        { name: 'nome', type: 'text', placeholder: 'Nome do Antibiótico' },
        { name: 'dose', type: 'text', placeholder: 'Dose (ex: 2g)' },
        { name: 'hora', type: 'time' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Adicionar', handler: (data) => {
            if (data.nome && data.dose) {
              this.antibioticsList.push({
                nome: data.nome,
                dose: data.dose,
                hora: data.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                repiques: []
              });
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
        { text: 'Adicionar', handler: (data) => {
            if (data.dose) {
              this.antibioticsList[atbIndex].repiques.push({
                dose: data.dose,
                hora: data.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
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
        { name: 'hora', type: 'time', value: atb.hora }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Salvar', handler: (data) => {
            if (data.nome && data.dose) {
              this.antibioticsList[index].nome = data.nome;
              this.antibioticsList[index].dose = data.dose;
              this.antibioticsList[index].hora = data.hora;
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
        { text: 'Salvar', handler: (data) => {
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

  removerAntibiotico(index: number) {
    this.antibioticsList.splice(index, 1);
  }

  removerRepique(atbIndex: number, repiqueIndex: number) {
    this.antibioticsList[atbIndex].repiques.splice(repiqueIndex, 1);
  }
}
