import { ChangeDetectorRef, Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { AlertController, ToastController, ModalController, IonContent, IonRefresherContent, IonRefresher } from '@ionic/angular/standalone';
import { IonButton, IonIcon, IonCheckbox, IonModal } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, ValidationErrors, Validators } from '@angular/forms';

import { debounceTime, Subscription, timeout, catchError, of } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';


const NETWORK_TIMEOUT_MS = 20000;
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
  timeOutline,
  shieldCheckmarkOutline,
  checkmarkCircle,
  createOutline,
  lockClosedOutline,
  shieldCheckmark,
  chevronDownOutline,
  alertCircleOutline,
  cloudDoneOutline,
  medicalSharp, fitnessOutline,
} from 'ionicons/icons';

import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { HeaderActionButton } from '../../shared/components/header-institucional/header-action-button.model';
import { PatientInfoCardComponent } from '../../shared/components/patient-info-card/patient-info-card.component';
import { FormSectionComponent } from '../../shared/components/form-section/form-section.component';
import { RadioGroupComponent } from '../../shared/components/radio-group/radio-group.component';
import { CheckboxGroupComponent } from '../../shared/components/checkbox-group/checkbox-group.component';
import { TecnicaAnestesicaSectionComponent } from './components/tecnica-anestesica-section/tecnica-anestesica-section.component';
import { DadosVitaisSectionComponent } from './components/dados-vitais-section/dados-vitais-section.component';

import { SurgeryService } from 'src/app/core/services/surgery.service';
import { AnesthesiaRecordService } from 'src/app/core/services/anesthesia-record.service';
import { AnesthesiaRecordModel } from 'src/app/shared/models/anesthesia-record.model';
import { AuthService } from 'src/app/core/services/auth.service';
import { MasterDataService } from 'src/app/core/services/master-data.service';
import { SurgeryStatusEnum } from 'src/app/core/models/api-enums.model';
import { PreAnesthesicRecordService } from 'src/app/core/services/pre-anesthesic-record.service';
import { RecordViewerModalComponent, RecordData } from 'src/app/shared/components/record-viewer-modal/record-viewer-modal.component';
import { mapPreAnesthesiaToRecordData } from 'src/app/shared/models/pre-anesthesic.mapper';
import { maskTimeInput, normalizeTimeInput } from 'src/app/shared/utils/time-input.util';


@Component({
  selector: 'app-ficha-anestesica',
  standalone: true,
  imports: [IonRefresher, IonRefresherContent, IonContent,
    CommonModule,
    IonButton,
    IonIcon,
    IonCheckbox,
    IonModal,
    ReactiveFormsModule,
    FormsModule,
    StatusBarComponent,
    HeaderInstitucionalComponent,
    PatientInfoCardComponent,
    FormSectionComponent,
    RadioGroupComponent,
    CheckboxGroupComponent,
    TecnicaAnestesicaSectionComponent,
    DadosVitaisSectionComponent,
    IonContent,
    IonRefresherContent,
    TranslatePipe,
  ],
  templateUrl: './ficha-anestesica.component.html',
  styleUrls: ['./ficha-anestesica.component.scss']
})
export class FichaAnestesicaComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  cirurgiaId: string | null = null;
  patientId: string | null = null;
  patient: any = null;
  selectedSurgery: any = null;
  selectedProcedure: any = null;
  isCancelled = false;
  canEdit = true;
  loggedUser: any;
  isReadOnlyRecord = false;
  forcedReadOnly = false;
  isResponsible = true;


  medicationsLista: { id: string; name: string; codigo?: string }[] = [];

  isMenuOpen = false;

  @HostListener('document:ionDidOpen', ['$event'])
  onSideMenuOpen(ev: Event) {
    const tag = (ev.target as HTMLElement | null)?.tagName?.toLowerCase();
    if (tag === 'ion-menu')
      this.isMenuOpen = true;
  }

  @HostListener('document:ionDidClose', ['$event'])
  onSideMenuClose(ev: Event) {
    const tag = (ev.target as HTMLElement | null)?.tagName?.toLowerCase();
    if (tag === 'ion-menu')
      this.isMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent) {
    if (!this.openDdl) return;
    const target = ev.target as HTMLElement | null;
    if (target && !target.closest('.ddl')) this.openDdl = null;
  }

  viaPreOptions: { label: string; value: string }[] = [];
  posicaoOptions: { label: string; value: string }[] = [];
  acessoVenosoOptions: { label: string; value: string }[] = [];
  condicoesAltaOptions: { label: string; value: string }[] = [];
  yesNoOptions: { label: string; value: string }[] = [];

  aldereteFields: {
    label: string;
    control: string;
    icon: string;
    options: { score: number; text: string }[];
  }[] = [];

  antibioticsList: any[] = [];
  isLoading = false;
  isSaving = false;
  showValidationErrors = false;

  isSignModalOpen = false;
  signatureAgreed = false;
  signatureTypedName = '';
  signaturePassword = '';
  signatureError = '';
  monitoringFinalizado = false;
  fichaFinalizada = false;
  fichaFinalizadaEm: string | null = null;
  fichaFinalizadaPor: string | null = null;

  private autoSaveSub?: Subscription;
  private conditionalSubs: Subscription[] = [];
  private langChangeSub?: Subscription;


  procedimentoLista: { id: string; name: string; codigo?: string }[] = [];
  equipeLista: { id: string; name: string; codigo?: string }[] = [];
  anestesistasLista: { id: string; name: string; codigo?: string }[] = [];

  openDdl: string | null = null;
  ddlFilter: Record<string, string> = {};

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private surgeryService: SurgeryService,
    private anesthesiaService: AnesthesiaRecordService,
    private alertController: AlertController,
    private toastController: ToastController,
    private location: Location,
    private authService: AuthService,
    private masterData: MasterDataService,
    private preAnesthesicService: PreAnesthesicRecordService,
    private modalCtrl: ModalController,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {
    addIcons({ checkmarkCircle, chevronDownOutline, addOutline, trashOutline, returnDownForwardOutline, closeCircleOutline, timeOutline, alertCircleOutline, lockClosedOutline, shieldCheckmarkOutline, syncOutline, printOutline, fitnessOutline, createOutline, medicalSharp, shieldCheckmark, cloudDoneOutline, pencilOutline, saveOutline, arrowBackOutline, closeOutline });
    this.initForm();
    this.applyTranslations();
    this.langChangeSub = this.translate.onLangChange.subscribe(() => this.applyTranslations());
  }

  private applyTranslations(): void {
    this.viaPreOptions = [
      { label: this.translate.instant('fichaAnestesica.preInducao.viaOptions.vo'), value: 'VO' },
      { label: this.translate.instant('fichaAnestesica.preInducao.viaOptions.im'), value: 'IM' },
      { label: this.translate.instant('fichaAnestesica.preInducao.viaOptions.iv'), value: 'IV' },
      { label: this.translate.instant('fichaAnestesica.preInducao.viaOptions.outras'), value: 'Outras' }
    ];

    this.posicaoOptions = [
      { label: this.translate.instant('fichaAnestesica.posicao.options.supina'), value: 'SUPINA' },
      { label: this.translate.instant('fichaAnestesica.posicao.options.prona'), value: 'PRONA' },
      { label: this.translate.instant('fichaAnestesica.posicao.options.sentado'), value: 'SENTADO' },
      { label: this.translate.instant('fichaAnestesica.posicao.options.lateralEsq'), value: 'LATERAL ESQUERDO' },
      { label: this.translate.instant('fichaAnestesica.posicao.options.lateralDir'), value: 'LATERAL DIREITO' },
      { label: this.translate.instant('fichaAnestesica.posicao.options.trendelenburg'), value: 'TRENDELENBURG' },
      { label: this.translate.instant('fichaAnestesica.posicao.options.litotomica'), value: 'LITOTÔMICA' }
    ];

    this.acessoVenosoOptions = [
      { label: this.translate.instant('fichaAnestesica.posicao.acessoOptions.periferico'), value: 'Periferico' },
      { label: this.translate.instant('fichaAnestesica.posicao.acessoOptions.central'), value: 'Central' }
    ];

    this.condicoesAltaOptions = [
      { label: this.translate.instant('fichaAnestesica.alderete.condicoesAltaOptions.acordado'), value: 'Acordado' },
      { label: this.translate.instant('fichaAnestesica.alderete.condicoesAltaOptions.sonolento'), value: 'Sonolento' },
      { label: this.translate.instant('fichaAnestesica.alderete.condicoesAltaOptions.intubado'), value: 'Intubado' }
    ];

    this.yesNoOptions = [
      { label: this.translate.instant('fichaAnestesica.common.yes'), value: 'sim' },
      { label: this.translate.instant('fichaAnestesica.common.no'), value: 'nao' }
    ];

    this.aldereteFields = [
      {
        label: this.translate.instant('fichaAnestesica.alderete.fields.consciencia.label'), control: 'consciencia', icon: '🧠',
        options: [
          { score: 2, text: this.translate.instant('fichaAnestesica.alderete.fields.consciencia.opt2') },
          { score: 1, text: this.translate.instant('fichaAnestesica.alderete.fields.consciencia.opt1') },
          { score: 0, text: this.translate.instant('fichaAnestesica.alderete.fields.consciencia.opt0') }
        ]
      },
      {
        label: this.translate.instant('fichaAnestesica.alderete.fields.atividade.label'), control: 'atividade', icon: '🏃',
        options: [
          { score: 2, text: this.translate.instant('fichaAnestesica.alderete.fields.atividade.opt2') },
          { score: 1, text: this.translate.instant('fichaAnestesica.alderete.fields.atividade.opt1') },
          { score: 0, text: this.translate.instant('fichaAnestesica.alderete.fields.atividade.opt0') }
        ]
      },
      {
        label: this.translate.instant('fichaAnestesica.alderete.fields.circulacao.label'), control: 'circulacao', icon: '❤️',
        options: [
          { score: 2, text: this.translate.instant('fichaAnestesica.alderete.fields.circulacao.opt2') },
          { score: 1, text: this.translate.instant('fichaAnestesica.alderete.fields.circulacao.opt1') },
          { score: 0, text: this.translate.instant('fichaAnestesica.alderete.fields.circulacao.opt0') }
        ]
      },
      {
        label: this.translate.instant('fichaAnestesica.alderete.fields.respiracao.label'), control: 'respiracao', icon: '🫁',
        options: [
          { score: 2, text: this.translate.instant('fichaAnestesica.alderete.fields.respiracao.opt2') },
          { score: 1, text: this.translate.instant('fichaAnestesica.alderete.fields.respiracao.opt1') },
          { score: 0, text: this.translate.instant('fichaAnestesica.alderete.fields.respiracao.opt0') }
        ]
      },
      {
        label: this.translate.instant('fichaAnestesica.alderete.fields.saturacao.label'), control: 'saturacao', icon: '🩸',
        options: [
          { score: 2, text: this.translate.instant('fichaAnestesica.alderete.fields.saturacao.opt2') },
          { score: 1, text: this.translate.instant('fichaAnestesica.alderete.fields.saturacao.opt1') },
          { score: 0, text: this.translate.instant('fichaAnestesica.alderete.fields.saturacao.opt0') }
        ]
      }
    ];

    this.fieldLabels = {
      'seguranca.identificadoAvaliado': this.translate.instant('fichaAnestesica.fieldLabels.seguranca.identificadoAvaliado'),
      'seguranca.consentimentoAssinado': this.translate.instant('fichaAnestesica.fieldLabels.seguranca.consentimentoAssinado'),
      'seguranca.equipamentosChecados': this.translate.instant('fichaAnestesica.fieldLabels.seguranca.equipamentosChecados'),
      'preInducao.recebeuMedPrevia': this.translate.instant('fichaAnestesica.fieldLabels.preInducao.recebeuMedPrevia'),
      'antibiotico.temAntibiotico': this.translate.instant('fichaAnestesica.fieldLabels.antibiotico.temAntibiotico'),
      'dadosVitais.pa': this.translate.instant('fichaAnestesica.fieldLabels.dadosVitais.pa'),
      'dadosVitais.fr': this.translate.instant('fichaAnestesica.fieldLabels.dadosVitais.fr'),
      'dadosVitais.temp': this.translate.instant('fichaAnestesica.fieldLabels.dadosVitais.temp'),
      'dadosVitais.spo2': this.translate.instant('fichaAnestesica.fieldLabels.dadosVitais.spo2'),
      'dadosVitais.peso': this.translate.instant('fichaAnestesica.fieldLabels.dadosVitais.peso'),
      'dadosVitais.asa': this.translate.instant('fichaAnestesica.fieldLabels.dadosVitais.asa'),
      'dadosVitais.entradaSala': this.translate.instant('fichaAnestesica.fieldLabels.dadosVitais.entradaSala'),
      'equipe.cirurgiao': this.translate.instant('fichaAnestesica.fieldLabels.equipe.cirurgiao'),
      'equipe.assistente': this.translate.instant('fichaAnestesica.fieldLabels.equipe.assistente'),
      'equipe.diagnosticoPre': this.translate.instant('fichaAnestesica.fieldLabels.equipe.diagnosticoPre'),
      'equipe.horaInicioAnestesia': this.translate.instant('fichaAnestesica.fieldLabels.equipe.horaInicioAnestesia'),
      'posicao.usoCoxim': this.translate.instant('fichaAnestesica.fieldLabels.posicao.usoCoxim'),
      'posicao.dificuldadePuncao': this.translate.instant('fichaAnestesica.fieldLabels.posicao.dificuldadePuncao'),
      'tecnica.anestesiaGeral': this.translate.instant('fichaAnestesica.fieldLabels.tecnica.anestesiaGeral'),
      'tecnica.circuitoAbsorvedor': this.translate.instant('fichaAnestesica.fieldLabels.tecnica.circuitoAbsorvedor'),
      'tecnica.bloqueiosEspinhais': this.translate.instant('fichaAnestesica.fieldLabels.tecnica.bloqueiosEspinhais'),
      'tecnica.cateter': this.translate.instant('fichaAnestesica.fieldLabels.tecnica.cateter'),
      'tecnica.opioide': this.translate.instant('fichaAnestesica.fieldLabels.tecnica.opioide'),
      'tecnica.sedacao': this.translate.instant('fichaAnestesica.fieldLabels.tecnica.sedacao'),
      'tecnica.suplementacaoO2': this.translate.instant('fichaAnestesica.fieldLabels.tecnica.suplementacaoO2'),
      'tecnica.bloqueioPlexo': this.translate.instant('fichaAnestesica.fieldLabels.tecnica.bloqueioPlexo'),
      'tecnica.neuroestimulador': this.translate.instant('fichaAnestesica.fieldLabels.tecnica.neuroestimulador'),
      'posProcedimento.horaTerminoCirurgia': this.translate.instant('fichaAnestesica.fieldLabels.posProcedimento.horaTerminoCirurgia'),
      'posProcedimento.diagnosticoPos': this.translate.instant('fichaAnestesica.fieldLabels.posProcedimento.diagnosticoPos'),
      'posProcedimento.horaTerminoAnestesia': this.translate.instant('fichaAnestesica.fieldLabels.posProcedimento.horaTerminoAnestesia'),
      'alderete.dor': this.translate.instant('fichaAnestesica.fieldLabels.alderete.dor'),
      'alderete.dorENV': this.translate.instant('fichaAnestesica.fieldLabels.alderete.dorENV'),
      'alderete.dorPAINAD': this.translate.instant('fichaAnestesica.fieldLabels.alderete.dorPAINAD'),
      'alderete.dorBPS': this.translate.instant('fichaAnestesica.fieldLabels.alderete.dorBPS'),
      'assinaturas.dataAssinatura': this.translate.instant('fichaAnestesica.fieldLabels.assinaturas.dataAssinatura'),
    };

    this.sectionLabels = {
      seguranca: this.translate.instant('fichaAnestesica.sectionLabels.seguranca'),
      preInducao: this.translate.instant('fichaAnestesica.sectionLabels.preInducao'),
      antibiotico: this.translate.instant('fichaAnestesica.sectionLabels.antibiotico'),
      dadosVitais: this.translate.instant('fichaAnestesica.sectionLabels.dadosVitais'),
      equipe: this.translate.instant('fichaAnestesica.sectionLabels.equipe'),
      posicao: this.translate.instant('fichaAnestesica.sectionLabels.posicao'),
      tecnica: this.translate.instant('fichaAnestesica.sectionLabels.tecnica'),
      posProcedimento: this.translate.instant('fichaAnestesica.sectionLabels.posProcedimento'),
      alderete: this.translate.instant('fichaAnestesica.sectionLabels.alderete'),
      assinaturas: this.translate.instant('fichaAnestesica.sectionLabels.assinaturas'),
    };
  }

  ngOnInit() {
    this.loggedUser = this.authService.getUser();
    this.cirurgiaId = this.route.snapshot.paramMap.get('id');
    this.patientId = this.route.snapshot.paramMap.get('patientId');
    this.forcedReadOnly = this.route.snapshot.queryParamMap.get('readOnly') === 'true';
    this.loadDropdownLists();

    if (this.cirurgiaId && this.patientId) {
      this.tentarReenviarRascunho();

      this.anesthesiaService.getMonitoringStatus(Number(this.cirurgiaId)).pipe(
        timeout(NETWORK_TIMEOUT_MS),
        catchError(() => of(null)),
      ).subscribe((status) => {
        if (status !== null) this.monitoringFinalizado = status === SurgeryStatusEnum.Concluido;
      });

      // Buscar a ficha pré-anestésica do backend e salvar no storage ANTES de carregar a ficha
      // anestésica: valores corrigidos pelo médico na pré-anestésica (ex.: peso) precisam estar
      // disponíveis no storage a tempo de prevalecer sobre o dado original do AGHU.
      this.preAnesthesicService.getByAnesthesiaRecordId(Number(this.cirurgiaId)).subscribe({
        next: (preData) => {
          if (preData) {
            localStorage.setItem(`preAnesthesiaData_${this.cirurgiaId}`, JSON.stringify(preData));
          }
          this.loadPatientData(this.cirurgiaId!, this.patientId!).catch(() => this.onLoadPatientDataFailed());
        },
        error: () => this.loadPatientData(this.cirurgiaId!, this.patientId!).catch(() => this.onLoadPatientDataFailed())
      });
    }

    this.setupConditionalLogic();
    this.startAutoSave();

    window.visualViewport?.addEventListener('resize', this.onViewportChange);
    window.visualViewport?.addEventListener('scroll', this.onViewportChange);
  }

  ngOnDestroy() {
    this.openRecordModal?.dismiss().catch(() => { });
    this.conditionalSubs.forEach(sub => sub.unsubscribe());
    this.langChangeSub?.unsubscribe();
    window.visualViewport?.removeEventListener('resize', this.onViewportChange);
    window.visualViewport?.removeEventListener('scroll', this.onViewportChange);
  }

  private openRecordModal?: HTMLIonModalElement;

  private startAutoSave() {
    this.autoSaveSub?.unsubscribe();
    this.autoSaveSub = this.form.valueChanges
      .pipe(debounceTime(1500))
      .subscribe(() => {
        if (this.isReadOnlyRecord || this.fichaFinalizada)
          return;

        if (!this.isSaving)
          this.persistDraft();
      });
  }

  private initForm() {
    this.form = this.fb.group({
      seguranca: this.fb.group({
        identificadoAvaliado: ['', Validators.required],
        consentimentoAssinado: ['', Validators.required],
        equipamentosChecados: ['', Validators.required],
        atencao: ['']
      }),
      preInducao: this.fb.group({
        recebeuMedPrevia: ['', Validators.required],
        hora: [''], farmaco: [''], farmacoId: [''], via: [''], outrasVia: ['']
      }),
      antibiotico: this.fb.group({
        temAntibiotico: ['', Validators.required]
      }),
      dadosVitais: this.fb.group({
        pa: ['', Validators.required],
        fr: ['', Validators.required],
        temp: ['', Validators.required],
        spo2: ['', Validators.required],
        peso: ['', Validators.required],
        asa: ['', Validators.required],
        entradaSala: ['', Validators.required]
      }),
      equipe: this.fb.group({
        cirurgiao: ['', Validators.required],
        assistente: ['', Validators.required],
        diagnosticoPre: ['', Validators.required],
        horaInicioAnestesia: ['', Validators.required]
      }),
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
      tecnica: this.fb.group({
        anestesiaGeral: ['', Validators.required],
        respiracaoAssistida: [[]],
        respiracaoControlada: [[]],
        circuitoAbsorvedor: ['', Validators.required],
        vaGuedel: [false], vaMascLaringea: [false], vaMascFacial: [false], vaTubo: [false],
        guedelNo: [''], mascLaringeaNo: [''], mascFacialNo: [''], tuboNo: [''],
        cuff: [false], iot: [false], oral: [false], nasal: [false],
        facil: [false], dificil: [false],
        tipoSimples: [false], tipoOutras: [false], tipoOutrasTexto: [''],
        tipoEndobronquico: [false], tipoAramado: [false],
        tecLaringoscopia: [false], tecBroncofibroscopia: [false], tecRetrograda: [false],
        tecTraqueostomia: [false], tecVideolaringoscopia: [false],
        tecVAOutras: [false], tecVAOutrasTexto: [''],
        bloqueiosEspinhais: ['', Validators.required],
        nivelPuncao: [[]],
        posicaoPuncao: [''], cateter: [''], opioide: [''], numeroPuncoes: [''],
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
      posProcedimento: this.fb.group({
        procedimentos: this.fb.array([this.createProcedimentoRow()]),
        horaTerminoCirurgia: ['', Validators.required],
        diagnosticoPos: ['', Validators.required],
        horaTerminoAnestesia: ['', Validators.required]
      }),
      alderete: this.fb.group({
        consciencia: [''], atividade: [''], circulacao: [''], respiracao: [''],
        saturacao: [''], horaAvaliacao: [''],
        condicoesClinicasAlta: [[]],
        condicoesAltaOutras: [''],
        dor: ['', Validators.required],
        dorUsouENV: [false], dorENV: [''],
        dorUsouPAINAD: [false], dorPAINAD: [''],
        dorUsouBPS: [false], dorBPS: [''],
        conduta: ['']
      }, { validators: this.dorGroupValidator }),
      assinaturas: this.fb.group({
        primeiroAnestesista: [''],
        segundoAnestesista: [''],
        dataAssinatura: [new Date().toISOString().split('T')[0], Validators.required]
      })
    });
  }

  private setupConditionalLogic() {
    this.conditionalSubs.forEach(sub => sub.unsubscribe());
    this.conditionalSubs = [];

    const atbGroup = this.form.get('antibiotico') as FormGroup;
    const tecGroup = this.form.get('tecnica') as FormGroup;
    const aldGroup = this.form.get('alderete') as FormGroup;

    const bloqueiosSub = tecGroup?.get('bloqueiosEspinhais')?.valueChanges.subscribe(val => {
      const c1 = tecGroup.get('cateter');
      const c2 = tecGroup.get('opioide');
      if (val === 'sim') {
        c1?.setValidators([Validators.required]);
        c2?.setValidators([Validators.required]);
      } else {
        c1?.clearValidators(); c1?.setValue('');
        c2?.clearValidators(); c2?.setValue('');
      }
      c1?.updateValueAndValidity(); c2?.updateValueAndValidity();
    });
    if (bloqueiosSub) this.conditionalSubs.push(bloqueiosSub);

    const plexoSub = tecGroup?.get('bloqueioPlexo')?.valueChanges.subscribe(val => {
      const c = tecGroup.get('neuroestimulador');
      if (val === 'sim') c?.setValidators([Validators.required]);
      else { c?.clearValidators(); c?.setValue(''); }
      c?.updateValueAndValidity();
    });
    if (plexoSub) this.conditionalSubs.push(plexoSub);

    const dorSub = aldGroup?.get('dor')?.valueChanges.subscribe(val => {
      if (this.isDorSimValue(val)) {
        this.applyDorScaleValidators();
      } else {
        this.clearDorScales(true);
      }
      aldGroup.updateValueAndValidity({ emitEvent: false });
    });
    if (dorSub) this.conditionalSubs.push(dorSub);

    const scaleSub = (flagKey: string, valueKey: string, min: number, max: number) => {
      const flagSub = aldGroup?.get(flagKey)?.valueChanges.subscribe(checked => {
        this.syncDorScaleValidator(flagKey, valueKey, min, max, this.asChecked(checked));
      });
      const valueSub = aldGroup?.get(valueKey)?.valueChanges.subscribe(() => {
        aldGroup.updateValueAndValidity({ emitEvent: false });
      });
      if (flagSub) this.conditionalSubs.push(flagSub);
      if (valueSub) this.conditionalSubs.push(valueSub);
    };
    scaleSub('dorUsouENV', 'dorENV', 0, 10);
    scaleSub('dorUsouPAINAD', 'dorPAINAD', 0, 10);
    scaleSub('dorUsouBPS', 'dorBPS', 3, 12);
  }

  private dorScales = [
    { flagKey: 'dorUsouENV', valueKey: 'dorENV', min: 0, max: 10 },
    { flagKey: 'dorUsouPAINAD', valueKey: 'dorPAINAD', min: 0, max: 10 },
    { flagKey: 'dorUsouBPS', valueKey: 'dorBPS', min: 3, max: 12 }
  ];

  private isDorSimValue(value: unknown): boolean {
    return String(value || '').trim().toLowerCase() === 'sim';
  }

  private asChecked(value: unknown): boolean {
    return value === true || value === 1 || String(value).trim().toLowerCase() === 'true';
  }

  private isDorScaleValueValid(value: unknown, min: number, max: number): boolean {
    const text = String(value ?? '').trim();
    if (!/^\d+$/.test(text)) return false;

    const numberValue = Number(text);
    return Number.isInteger(numberValue) && numberValue >= min && numberValue <= max;
  }

  private dorGroupValidator = (control: AbstractControl): ValidationErrors | null => {
    const group = control as FormGroup;

    if (!this.isDorSimValue(group.get('dor')?.value)) {
      return null;
    }

    const selectedScales = this.dorScales.filter(scale => this.asChecked(group.get(scale.flagKey)?.value));
    if (selectedScales.length === 0) {
      return { dorScaleRequired: true };
    }

    const hasInvalidSelectedScale = selectedScales.some(scale =>
      !this.isDorScaleValueValid(group.get(scale.valueKey)?.value, scale.min, scale.max)
    );

    return hasInvalidSelectedScale ? { dorScaleInvalid: true } : null;
  };

  isDorScaleSelected(flagKey: string): boolean {
    return this.asChecked(this.form.get(`alderete.${flagKey}`)?.value);
  }

  isDorPresente(): boolean {
    return this.isDorSimValue(this.form.get('alderete.dor')?.value);
  }

  setDor(value: 'sim' | 'nao') {
    const aldGroup = this.form.get('alderete') as FormGroup;
    const dorControl = aldGroup.get('dor');

    dorControl?.setValue(value, { emitEvent: false });
    dorControl?.markAsTouched();
    dorControl?.markAsDirty();

    if (value === 'nao') {
      this.clearDorScales(true);
    } else {
      this.applyDorScaleValidators();
    }

    aldGroup.updateValueAndValidity({ emitEvent: false });
  }

  toggleDorScale(flagKey: string, valueKey: string, min: number, max: number, checked: boolean) {
    const aldGroup = this.form.get('alderete') as FormGroup;

    if (!this.isDorPresente()) {
      aldGroup.get('dor')?.setValue('sim', { emitEvent: false });
      aldGroup.get('dor')?.markAsTouched();
    }

    aldGroup.get(flagKey)?.setValue(checked, { emitEvent: false });
    aldGroup.get(flagKey)?.markAsTouched();
    aldGroup.get(flagKey)?.markAsDirty();

    if (!checked) {
      aldGroup.get(valueKey)?.setValue('', { emitEvent: false });
    }

    this.syncDorScaleValidator(flagKey, valueKey, min, max, checked);
    aldGroup.updateValueAndValidity({ emitEvent: false });
  }

  isDorSectionInvalid(): boolean {
    const aldGroup = this.form.get('alderete') as FormGroup;
    const dorControl = aldGroup.get('dor');
    const shouldShow = this.showValidationErrors ||
      !!dorControl?.touched ||
      this.dorScales.some(scale =>
        !!aldGroup.get(scale.flagKey)?.touched || !!aldGroup.get(scale.valueKey)?.touched
      );

    if (!shouldShow) return false;
    if (dorControl?.invalid)
      return true;

    if (!this.isDorPresente())
      return false;

    return !!aldGroup.errors?.['dorScaleRequired'] ||
      !!aldGroup.errors?.['dorScaleInvalid'] ||
      this.dorScales.some(scale => {
        const valueControl = aldGroup.get(scale.valueKey);
        return this.asChecked(aldGroup.get(scale.flagKey)?.value) && !!valueControl?.invalid;
      });
  }

  private applyDorScaleValidators() {
    this.dorScales.forEach(scale => {
      const checked = this.asChecked(this.form.get(`alderete.${scale.flagKey}`)?.value);
      this.form.get(`alderete.${scale.flagKey}`)?.setValue(checked, { emitEvent: false });
      this.syncDorScaleValidator(scale.flagKey, scale.valueKey, scale.min, scale.max, checked, false);
    });
    (this.form.get('alderete') as FormGroup).updateValueAndValidity({ emitEvent: false });
  }

  private clearDorScales(clearValues: boolean) {
    const aldGroup = this.form.get('alderete') as FormGroup;
    this.dorScales.forEach(scale => {
      aldGroup.get(scale.flagKey)?.setValue(false, { emitEvent: false });
      const valueControl = aldGroup.get(scale.valueKey);
      valueControl?.clearValidators();
      if (clearValues) valueControl?.setValue('', { emitEvent: false });
      valueControl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private syncDorScaleValidator(flagKey: string, valueKey: string, min: number, max: number, checked: boolean, updateGroup = true) {
    const aldGroup = this.form.get('alderete') as FormGroup;
    const valueControl = aldGroup.get(valueKey);

    if (checked && this.isDorPresente()) {
      valueControl?.setValidators([
        Validators.required,
        Validators.min(min),
        Validators.max(max),
        Validators.pattern(/^\d+$/)
      ]);
    } else {
      valueControl?.clearValidators();
    }

    valueControl?.updateValueAndValidity({ emitEvent: false });
    if (updateGroup) aldGroup.updateValueAndValidity({ emitEvent: false });
  }

  addingAtb = false;
  newAtb: any = { medicationId: '', nome: '', dose: '', via: 'IV', hora: '' };

  startAddAtb() {
    this.addingAtb = true;
    this.newAtb = {
      medicationId: '', nome: '', dose: '', via: 'IV',
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.ddlFilter['atb-new'] = '';
  }

  cancelAddAtb() { this.addingAtb = false; }

  selectAtbMedication(id: string): void {
    const found = this.medicationsLista.find(m => String(m.id) === String(id));
    this.newAtb.medicationId = id;
    this.newAtb.nome = found?.name || '';
    this.ddlFilter['atb-new'] = '';
    this.openDdl = null;
  }

  selectPreFarmaco(id: string): void {
    const found = this.medicationsLista.find(m => String(m.id) === String(id));
    this.form.get('preInducao.farmacoId')?.setValue(id);
    this.form.get('preInducao.farmaco')?.setValue(found?.name || '');
    this.form.get('preInducao.farmaco')?.markAsDirty();
    this.ddlFilter['preFarmaco'] = '';
    this.openDdl = null;
  }

  confirmAddAtb() {
    if (!this.newAtb.nome?.trim() || !this.newAtb.dose?.trim()) {
      this.toast(this.translate.instant('fichaAnestesica.toasts.selecioneAntibiotico'), 'warning');
      return;
    }
    this.antibioticsList = [
      ...this.antibioticsList,
      {
        medicationId: this.newAtb.medicationId || null,
        nome: this.newAtb.nome.trim(),
        dose: this.newAtb.dose.trim(),
        via: (this.newAtb.via || 'IV').trim(),
        hora: this.newAtb.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temRepique: 'nao',
        repiques: []
      }
    ];
    this.addingAtb = false;
  }

  toggleRepique(index: number, value: string) {
    this.antibioticsList[index].temRepique = value;
    if (value === 'sim' && this.antibioticsList[index].repiques.length === 0) {
      this.adicionarRepique(index);
    } else if (value === 'nao') {
      this.antibioticsList[index].repiques = [];
    }
  }

  async adicionarRepique(atbIndex: number) {
    const alert = await this.alertController.create({
      header: this.translate.instant('fichaAnestesica.antibiotico.novoRepiqueHeader'),
      subHeader: this.translate.instant('fichaAnestesica.antibiotico.paraLabel', { nome: this.antibioticsList[atbIndex].nome }),
      inputs: [
        { name: 'dose', type: 'text', placeholder: this.translate.instant('fichaAnestesica.antibiotico.doseRepiquePlaceholder') },
        { name: 'hora', type: 'time' }
      ],
      buttons: [
        { text: this.translate.instant('fichaAnestesica.antibiotico.cancelar'), role: 'cancel' },
        {
          text: this.translate.instant('fichaAnestesica.antibiotico.adicionar'), handler: (data) => {
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

  removerAntibiotico(index: number) {
    this.antibioticsList.splice(index, 1);
  }

  removerRepique(atbIndex: number, repiqueIndex: number) {
    this.antibioticsList[atbIndex].repiques.splice(repiqueIndex, 1);
  }

  get aldereteTotal(): number {
    const g = this.form.get('alderete') as FormGroup;
    if (!g)
      return 0;

    return ['consciencia', 'atividade', 'circulacao', 'respiracao', 'saturacao']
      .reduce((total, k) => total + (parseInt(g.get(k)?.value, 10) || 0), 0);
  }

  get aldereteStatus(): { text: string, color: string } {
    const s = this.aldereteTotal;
    if (s >= 8)
      return { text: this.translate.instant('fichaAnestesica.alderete.status.apto'), color: '#10b981' };

    if (s >= 5)
      return { text: this.translate.instant('fichaAnestesica.alderete.status.observacao'), color: '#f59e0b' };

    return { text: this.translate.instant('fichaAnestesica.alderete.status.monitoramento'), color: '#ef4444' };
  }

  getFormGroup(name: string): FormGroup {
    return this.form.get(name) as FormGroup;
  }

  isSectionInvalid(name: string): boolean {
    const g = this.form.get(name);
    return !!(g && g.invalid && (g.touched || this.showValidationErrors));
  }

  private persistDraft(data?: any) {
    if (this.isReadOnlyRecord)
      return;

    if (!this.cirurgiaId)
      return;

    const draftData = data || {
      ...this.form.value,
      antibioticsList: this.antibioticsList,
      _isErrorDraft: true,
      _createdAt: new Date().toISOString()
    };

    const formattedData = {
      ...draftData,
      patientId: draftData.patientId ? String(draftData.patientId) : this.patientId ? String(this.patientId) : null,
      cirurgiaId: draftData.cirurgiaId ? String(draftData.cirurgiaId) : this.cirurgiaId ? String(this.cirurgiaId) : null,
      surgeryId: draftData.surgeryId ? String(draftData.surgeryId) : this.selectedSurgery?.id ? String(this.selectedSurgery.id) : null,
      pacienteId: draftData.pacienteId ? String(draftData.pacienteId) : this.patientId ? String(this.patientId) : null,
      assinaturas: {
        ...draftData.assinaturas,
        primeiroAnestesistaId: this.loggedUser?.id ? String(this.loggedUser.id) : draftData.assinaturas?.primeiroAnestesistaId || null,
        segundoAnestesistaId: draftData.assinaturas?.segundoAnestesistaId || null,
        segundoAnestesistaNome: draftData.assinaturas?.segundoAnestesista
          ? this.getSelectedLabel(this.anestesistasLista, draftData.assinaturas.segundoAnestesista)
          : draftData.assinaturas?.segundoAnestesistaNome || ''
      },
      firstAnesthesiologistId: this.loggedUser?.id ? String(this.loggedUser.id) : draftData.firstAnesthesiologistId || null,
      secondAnesthesiologistId: draftData.secondAnesthesiologistId || null
    };

    this.anesthesiaService.saveDraft(this.cirurgiaId, formattedData);
  }

  private async tentarReenviarRascunho() {
    if (this.isReadOnlyRecord || this.fichaFinalizada)
      return;

    if (!this.cirurgiaId)
      return;

    const draft = this.anesthesiaService.getDraft(this.cirurgiaId);

    if (!draft || !draft._isErrorDraft)
      return;

    const { _isErrorDraft, _createdAt, _error, _timestamp, _lastRetry, _retryCount, ...cleanDraft } = draft;
    const originalFormValue = this.form.value;
    const originalAntibioticsList = [...this.antibioticsList];

    try {
      this.form.patchValue(cleanDraft);
      if (cleanDraft.antibioticsList) {
        this.antibioticsList = cleanDraft.antibioticsList;
      }

      const record: any = this.buildPayload();
      record.finalize = !!draft.finalize;

      this.form.patchValue(originalFormValue);
      this.antibioticsList = originalAntibioticsList;

      this.isSaving = true;
      this.anesthesiaService.saveRecord(record).subscribe({
        next: async () => {
          this.anesthesiaService.clearDraft(this.cirurgiaId!);
          this.isSaving = false;
          if (record.finalize) {
            this.fichaFinalizada = true;
            this.canEdit = false;
            this.form.disable({ emitEvent: false });
          }
          this.toast(this.translate.instant('fichaAnestesica.toasts.rascunhoReenviado'), 'success');
        },
        error: async (error) => {
          this.isSaving = false;
          this.persistDraft({
            ...draft,
            _lastRetry: new Date().toISOString(),
            _retryCount: (draft._retryCount || 0) + 1,
            _lastError: error?.message || 'Erro no reenvio'
          });
        }
      });
    } catch (error) {
      this.form.patchValue(originalFormValue);
      this.antibioticsList = originalAntibioticsList;
      console.error('Erro ao preparar rascunho para reenvio:', error);
    }
  }

  private loadPatientData(id: string, patientId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isLoading = true;
      this.surgeryService.getPatientDate(Number(id), patientId).pipe(
        timeout(NETWORK_TIMEOUT_MS),
      ).subscribe({
        next: (res: any) => {
          const surgeryData = res?.data;
          if (!surgeryData?.patient) {
            this.isLoading = false;
            resolve();
            return;
          }

          this.patient = {
            ...surgeryData.patient,
            surgeryPerformed: surgeryData.surgeries?.[0]?.procedures?.find((p: any) => p.isPrimary)?.description,
            gender: surgeryData.patient.gender || 'M',
            weight: (surgeryData.patient.weightKg ?? '').toString(),
            birthDate: this.formatDate(surgeryData.patient.birthDate)
          };
          this.selectedSurgery = surgeryData.surgeries?.find((x: any) => String(x.id) === String(surgeryData.surgeryId))
            ?? surgeryData.surgeries?.[0]
            ?? surgeryData.patient.surgeries?.find((x: any) => String(x.id) === String(surgeryData.surgeryId))
            ?? surgeryData.patient.surgeries?.[0]
            ?? (surgeryData.surgeryId ? { id: surgeryData.surgeryId, surgeryDate: surgeryData.surgeryDate } : null);

          this.isCancelled = surgeryData.patient.status === SurgeryStatusEnum.Cancelada;

          const firstAnesthesiologistId = surgeryData.firstAnesthesiologistId;

          this.isResponsible = !!firstAnesthesiologistId && String(firstAnesthesiologistId) === String(this.loggedUser?.id);

          this.isReadOnlyRecord = this.forcedReadOnly || this.isCancelled || !this.isResponsible;

          this.fichaFinalizada = surgeryData.status === SurgeryStatusEnum.Concluido;
          this.fichaFinalizadaEm = surgeryData.signatureDate ?? surgeryData.lastUpdate ?? null;
          this.fichaFinalizadaPor = surgeryData.firstAnesthesiologistName ?? this.expectedSignatureName ?? null;

          this.canEdit = !this.isReadOnlyRecord && !this.fichaFinalizada;

          const draft = this.anesthesiaService.getDraft(this.cirurgiaId!);
          this.anesthesiaService.getLatestByPatient(this.cirurgiaId!, patientId).pipe(
            timeout(NETWORK_TIMEOUT_MS),
          ).subscribe({
            next: (savedRecord) => {
              if (draft) {

                this.hydrateProcedimentos((draft as any)?.posProcedimento?.procedimentos);
                this.form.patchValue(draft);
                if (draft.antibioticsList) this.antibioticsList = draft.antibioticsList;
              } else if (savedRecord) {

                const procedimentos = (savedRecord as any)?.posProcedimento?.procedimentos;
                this.hydrateProcedimentos(procedimentos);
                const formValue = { ...savedRecord };
                delete formValue.posProcedimento?.procedimentos;
                this.form.patchValue(formValue);
                setTimeout(() => {
                  const tecnicaSection = document.querySelector('app-tecnica-anestesica-section') as any;
                  if (tecnicaSection && tecnicaSection.refresh) tecnicaSection.refresh();
                }, 50);
                if ((savedRecord as any).antibioticsList) {
                  this.antibioticsList = (savedRecord as any).antibioticsList;
                }
              } else {

                const procedimentosFromSurgery = this.buildProcedimentosFromSurgery();
                this.hydrateProcedimentos(procedimentosFromSurgery);
                this.form.get('dadosVitais.peso')?.patchValue(this.pesoFromPreAnestesicaOuAghu());
              }

              if (this.fichaFinalizada || this.forcedReadOnly || this.isCancelled)
                this.form.disable({ emitEvent: false });

              this.isLoading = false;
              resolve();
            },
            error: (err) => {
              console.warn('[FichaAnestesica] Falha ao buscar ficha na API, usando rascunho local se houver', err);
              if (draft) {
                this.hydrateProcedimentos((draft as any)?.posProcedimento?.procedimentos);
                this.form.patchValue(draft);
                if (draft.antibioticsList) this.antibioticsList = draft.antibioticsList;
                if (this.fichaFinalizada || this.forcedReadOnly || this.isCancelled)
                  this.form.disable({ emitEvent: false });
                this.isLoading = false;
                resolve();
              } else {
                this.isLoading = false;
                reject(err);
              }
            }
          });
        },
        error: (err) => {
          this.isLoading = false;
          reject(err);
        }
      });
    });
  }

  private onLoadPatientDataFailed() {
    this.toast(this.translate.instant('fichaAnestesica.toasts.naoFoiPossivelCarregarFicha'), 'danger');
  }

  private pesoFromPreAnestesicaOuAghu(): number | string {
    try {
      const raw = localStorage.getItem(`preAnesthesiaData_${this.cirurgiaId}`);
      const preData = raw ? JSON.parse(raw) : null;
      const pesoPreAnestesica = preData?.anthropometry?.weightKg;
      if (pesoPreAnestesica !== null && pesoPreAnestesica !== undefined && pesoPreAnestesica !== '') {
        return pesoPreAnestesica;
      }
    } catch (error) {
      console.warn('Não foi possível ler o peso da ficha pré-anestésica no storage:', error);
    }
    return this.patient?.weightKg ?? this.patient?.weight ?? '';
  }

  private formatDate(dateStr: string): string {
    if (!dateStr)
      return '--';

    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private async toast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const t = await this.toastController.create({ message, duration: 2500, color, position: 'top' });
    await t.present();
  }

  async confirmarLimpeza() {
    const alert = await this.alertController.create({
      header: this.translate.instant('fichaAnestesica.confirmarLimpezaAlert.header'),
      message: this.translate.instant('fichaAnestesica.confirmarLimpezaAlert.message'),
      buttons: [
        { text: this.translate.instant('fichaAnestesica.confirmarLimpezaAlert.cancelar'), role: 'cancel' },
        {
          text: this.translate.instant('fichaAnestesica.confirmarLimpezaAlert.limpar'),
          cssClass: 'alert-button-danger',
          handler: () => this.doLimpar()
        }
      ]
    });
    await alert.present();
  }

  private doLimpar() {
    this.initForm();
    this.antibioticsList = [];
    this.setupConditionalLogic();

    if (this.patient) {
      this.form.get('dadosVitais.peso')?.patchValue(this.pesoFromPreAnestesicaOuAghu());
    }

    if (this.cirurgiaId) {
      this.anesthesiaService.clearLatestRecord(this.cirurgiaId).subscribe({
        next: () => { },
        error: () => this.toast(this.translate.instant('fichaAnestesica.toasts.rascunhoLimpoFalhouServidor'), 'warning')
      });
    }

    this.toast(this.translate.instant('fichaAnestesica.toasts.formularioLimpo'), 'success');

    setTimeout(() => {
      document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }

  async openSignModal() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showValidationErrors = true;

      const missing = this.getMissingFields();

      const bySection: Record<string, string[]> = {};
      missing.forEach(m => {
        (bySection[m.section] ||= []).push(m.label);
      });

      const alert = await this.alertController.create({
        header: this.translate.instant('fichaAnestesica.validationAlert.header'),
        subHeader: this.translate.instant('fichaAnestesica.validationAlert.subHeader', { count: missing.length }),
        message: this.translate.instant('fichaAnestesica.validationAlert.message'),
        cssClass: 'validation-alert',
        buttons: [{
          text: this.translate.instant('fichaAnestesica.validationAlert.entendi'),
          role: 'cancel',
          handler: () => {
            setTimeout(() => {
              this.scrollToFirstInvalid();
            }, 300);
          }
        }],
      });
      await alert.present();

      // Remove o scroll imediato daqui
      // this.scrollToFirstInvalid();
      return;
    }

    this.signatureAgreed = false;
    this.signatureTypedName = '';
    this.signaturePassword = '';
    this.signatureError = '';
    this.isSignModalOpen = true;
  }

  closeSignModal() {
    this.isSignModalOpen = false;
  }

  onSignatureAgreedChange(checked: boolean): void {
    this.signatureAgreed = checked;
    this.cdr.detectChanges();
  }

  get expectedSignatureName(): string {
    return (this.loggedUser?.name || this.loggedUser?.fullName || '').trim();
  }

  onEnviarClick() {
    if (this.monitoringFinalizado) {
      this.openSignModal();
    } else {
      this.executarSalvamento(false);
    }
  }

  get headerActionButtons(): HeaderActionButton[] {
    const buttons: HeaderActionButton[] = [];

    if (this.canEdit) {
      buttons.push({
        id: 'salvar-ficha',
        icon: 'shield-checkmark-outline',
        color: 'primary',
        ariaLabel: this.translate.instant('fichaAnestesica.header.saveAria'),
        label: this.translate.instant('fichaAnestesica.header.sendLabel'),
        disabled: this.isSaving || this.isCancelled,
        action: () => this.onEnviarClick()
      });
    }

    buttons.push({
      id: 'ir-para-cirurgia',
      icon: 'fitness-outline',
      color: 'warning',
      ariaLabel: this.translate.instant('fichaAnestesica.header.goToSurgeryAria'),
      label: this.translate.instant('fichaAnestesica.header.surgeryLabel'),
      disabled: this.isSaving || this.isCancelled || !this.canAccessMonitoring,
      action: () => this.irParaCirurgia()
    });

    return buttons;
  }

  confirmarESalvar() {
    this.signatureError = '';
    if (!this.signatureAgreed) {
      this.signatureError = this.translate.instant('fichaAnestesica.signatureErrors.confirmeVeracidade');
      return;
    }

    const typed = this.signatureTypedName.trim();
    const expected = this.expectedSignatureName;
    if (!typed) {
      this.signatureError = this.translate.instant('fichaAnestesica.signatureErrors.digiteNomeCompleto');
      return;
    }
    if (expected && typed.toLowerCase() !== expected.toLowerCase()) {
      this.signatureError = this.translate.instant('fichaAnestesica.signatureErrors.nomeNaoConfere', { expected });
      return;
    }
    if (!this.signaturePassword.trim()) {
      this.signatureError = this.translate.instant('fichaAnestesica.signatureErrors.digiteSenha');
      return;
    }

    this.form.get('assinaturas.primeiroAnestesista')?.setValue(typed);
    this.form.get('assinaturas.dataAssinatura')?.setValue(new Date().toISOString().split('T')[0]);
    this.isSignModalOpen = false;
    this.executarSalvamento(true);
  }

  /**
   * @param finalize Quando true, este é o salvamento DEFINITIVO da ficha (só deve ser chamado
   * depois da confirmação de nome/senha, com o monitoramento já finalizado). O backend só
   * efetivamente marca a ficha como concluída/somente-leitura se o monitoramento já estiver
   * FINALIZADO — o front nunca decide isso sozinho.
   */
  private executarSalvamento(finalize: boolean) {
    this.isSaving = true;
    const record = this.buildPayload();

    const formattedRecord = {
      ...record,
      patientId: record.pacienteId ? String(record.pacienteId) : this.patientId ? String(this.patientId) : null,
      cirurgiaId: this.cirurgiaId ? String(this.cirurgiaId) : null,
      surgeryId: this.selectedSurgery?.id ? String(this.selectedSurgery.id) : null,
      finalize,
      firstAnesthesiologistId: this.loggedUser?.id ? String(this.loggedUser.id) : record.assinaturas.primeiroAnestesista,
      secondAnesthesiologistId: record.assinaturas.segundoAnestesista,
      assinaturas: {
        ...record.assinaturas,
        primeiroAnestesistaId: this.loggedUser?.id ? String(this.loggedUser.id) : record.assinaturas?.primeiroAnestesista,
        segundoAnestesistaId: record.assinaturas?.segundoAnestesista
      }
    };

    this.anesthesiaService.saveRecord(formattedRecord).subscribe({
      next: async () => {
        this.anesthesiaService.clearDraft(this.cirurgiaId!);
        this.isSaving = false;

        if (finalize) {
          this.fichaFinalizada = true;
          this.canEdit = false;
          this.fichaFinalizadaEm = new Date().toISOString();
          this.fichaFinalizadaPor = this.signatureTypedName || this.expectedSignatureName;
          this.form.disable({ emitEvent: false });
          this.toast(this.translate.instant('fichaAnestesica.toasts.fichaAssinadaSalva'), 'success');
        } else {
          this.toast(this.translate.instant('fichaAnestesica.toasts.fichaSalva'), 'success');
        }
      },
      error: async (error) => {
        this.isSaving = false;

        this.persistDraft({
          ...this.form.value,
          antibioticsList: this.antibioticsList,
          finalize,
          _isErrorDraft: true,
          _error: error?.message || 'Erro ao salvar ficha',
          _timestamp: new Date().toISOString()
        });

        this.toast(
          finalize
            ? this.translate.instant('fichaAnestesica.toasts.naoEnviadaRascunhoSalvo')
            : this.translate.instant('fichaAnestesica.toasts.naoSalvaRascunhoLocal'),
          'warning'
        );
      }
    });
  }

  private buildPayload(): AnesthesiaRecordModel {
    const raw = this.form.value;

    const resolveProfessional = (id: any) => {
      if (!id)
        return null;

      const found = this.asArray(this.masterData.getProfessionalsCache())
        .find((p: any) => String(p.id) === String(id));
      return found
        ? { id: found.id, name: found.name, registration: found.registration }
        : { id, name: null, registration: null };
    };

    const resolveProcedure = (id: any) => {
      if (!id) return null;
      const found = this.asArray(this.masterData.getProceduresCache())
        .find((p: any) => String(p.id) === String(id));
      return found
        ? { id: found.id, description: found.description, cid: found.cid }
        : { id, description: null, cid: null };
    };

    const procedimentos = (raw.posProcedimento?.procedimentos || [])
      .filter((p: any) => p.procedimentoId)
      .map((p: any) => ({
        ...resolveProcedure(p.procedimentoId),
        hora: p.hora,
        isPrimary: !!p.principal
      }));

    const primaryProc = procedimentos.find((p: any) => p.isPrimary) ?? procedimentos[0] ?? null;
    const segundoResolved = resolveProfessional(raw.assinaturas?.segundoAnestesista);
    const primeiroResolved = resolveProfessional(this.loggedUser?.id);
    const firstAnesthesiologistId = primeiroResolved?.id
      ? Number(primeiroResolved.id)
      : this.loggedUser?.id
        ? Number(this.loggedUser.id)
        : 0;

    const resolveMedication = (id: any, fallbackName?: string) => {
      if (!id && !fallbackName)
        return null;

      const found = id
        ? this.asArray(this.masterData.getMedicationsCache())
          .find((m: any) => String(m.id) === String(id))
        : null;
      return {
        id: found?.id ?? id ?? null,
        name: found?.description ?? found?.name ?? fallbackName ?? null
      };
    };

    const antibioticsPayload = (this.antibioticsList || []).map((atb: any) => {
      const med = resolveMedication(atb.medicationId, atb.nome);
      return {
        medicationId: med?.id ?? null,
        medicationName: med?.name ?? atb.nome ?? null,
        nome: atb.nome,
        dose: atb.dose,
        via: atb.via,
        hora: atb.hora,
        temRepique: atb.temRepique,
        repiques: (atb.repiques || []).map((r: any) => ({
          medicationId: med?.id ?? null,
          medicationName: med?.name ?? atb.nome ?? null,
          dose: r.dose,
          hora: r.hora
        }))
      };
    });

    const preFarmacoResolved = resolveMedication(
      raw.preInducao?.farmacoId,
      raw.preInducao?.farmaco
    );

    return {
      ...raw,
      cirurgiaId: this.cirurgiaId,
      patientId: this.patientId,
      surgeryId: this.selectedSurgery?.id ?? null,
      antibioticsList: antibioticsPayload,
      antibiotics: antibioticsPayload,
      cirurgias: procedimentos,
      surgeryPerformed: primaryProc?.description ?? '',
      firstAnesthesiologistId: firstAnesthesiologistId,
      firstAnesthesiologistName: primeiroResolved?.name ?? raw.assinaturas?.primeiroAnestesista ?? '',
      secondAnesthesiologistId: segundoResolved?.id ?? null,
      secondAnesthesiologistName: segundoResolved?.name ?? null,
      equipe: {
        ...raw.equipe,
        cirurgiao: resolveProfessional(raw.equipe?.cirurgiao),
        assistente: resolveProfessional(raw.equipe?.assistente)
      },
      preInducao: {
        ...raw.preInducao,
        farmacoId: preFarmacoResolved?.id ?? null,
        farmaco: preFarmacoResolved?.name ?? raw.preInducao?.farmaco ?? '',
        medication: preFarmacoResolved
      },
      posProcedimento: {
        ...raw.posProcedimento,
        procedimentos
      },
      alderete: { ...raw.alderete, destino: 'RPA' },
      assinaturas: {
        ...raw.assinaturas,
        primeiroAnestesista: primeiroResolved
          ?? { id: this.loggedUser?.id, name: raw.assinaturas?.primeiroAnestesista },
        segundoAnestesista: segundoResolved
      },
      signature: {
        signedBy: raw.assinaturas?.primeiroAnestesista,
        signedAt: new Date().toISOString(),
        userId: this.loggedUser?.id
      },
      meta: {
        submittedAt: new Date().toISOString(),
        appVersion: 'tablet-1.0'
      }
    } as any as AnesthesiaRecordModel;
  }

  imprimir() {
    if (this.selectedSurgery?.id) {
      window.open(this.anesthesiaService.getPdfUrl(this.selectedSurgery.id), '_blank');
    } else {
      this.toast(this.translate.instant('fichaAnestesica.toasts.naoIdentificouCirurgiaImpressao'), 'warning');
    }
  }

  voltar() {
    this.location.back();
  }

  get canAccessMonitoring(): boolean {
    return this.isResponsible || this.monitoringFinalizado;
  }

  async irParaCirurgia(): Promise<void> {
    if (!this.selectedSurgery?.id) {
      await this.toast(this.translate.instant('fichaAnestesica.toasts.naoIdentificouCirurgia'), 'warning');
      return;
    }

    if (this.isCancelled) {
      await this.toast(this.translate.instant('fichaAnestesica.toasts.pacienteCanceladoCirurgia'), 'warning');
      return;
    }

    if (!this.canAccessMonitoring) {
      await this.toast(this.translate.instant('fichaAnestesica.toasts.monitorizacaoNaoConcluida'), 'warning');
      return;
    }

    this.router.navigate(['/monitorizacao', this.selectedSurgery.id]);
  }


  onTimeInput(event: Event, control: AbstractControl | null): void {
    const input = event.target as HTMLInputElement;
    const masked = maskTimeInput(input.value);
    input.value = masked;
    control?.setValue(masked, { emitEvent: false });
  }

  onTimeBlur(event: Event, control: AbstractControl | null): void {
    const input = event.target as HTMLInputElement;
    const normalized = normalizeTimeInput(input.value);
    input.value = normalized;
    control?.setValue(normalized);
  }

  onAtbTimeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newAtb.hora = maskTimeInput(input.value);
    input.value = this.newAtb.hora;
  }

  onAtbTimeBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newAtb.hora = normalizeTimeInput(input.value);
    input.value = this.newAtb.hora;
  }

  get procedimentosArray(): FormArray {
    return this.form.get('posProcedimento.procedimentos') as FormArray;
  }

  private createProcedimentoRow(data?: { procedimentoId?: string; hora?: string; principal?: boolean }): FormGroup {
    return this.fb.group({
      procedimentoId: [data?.procedimentoId ?? '', Validators.required],
      hora: [data?.hora ?? '', Validators.required],
      principal: [data?.principal ?? false]
    });
  }

  addProcedimento(): void {
    if (!this.canEdit) return;

    this.procedimentosArray.push(this.createProcedimentoRow());
  }

  removeProcedimento(index: number): void {
    if (!this.canEdit) return;

    if (this.procedimentosArray.length <= 1) {
      this.procedimentosArray.at(0).reset({ procedimentoId: '', hora: '', principal: false });
      return;
    }
    const wasPrincipal = !!this.procedimentosArray.at(index)?.get('principal')?.value;
    this.procedimentosArray.removeAt(index);
    if (wasPrincipal && this.procedimentosArray.length > 0) {
      this.procedimentosArray.at(0).get('principal')?.setValue(true);
    }
  }

  setPrincipal(index: number, checked: boolean): void {
    if (!this.canEdit) return;

    this.procedimentosArray.controls.forEach((ctrl, i) => {
      ctrl.get('principal')?.setValue(i === index ? checked : false, { emitEvent: false });
    });
    this.procedimentosArray.updateValueAndValidity();
  }

  private hydrateProcedimentos(items?: any[] | null): void {
    if (!items || !items.length) {
      if (this.procedimentosArray.length === 0) {
        this.procedimentosArray.push(this.createProcedimentoRow());
      }
      return;
    }

    const arr = this.procedimentosArray;
    while (arr.length) arr.removeAt(0);

    items.forEach(it => {
      const processedItem = {
        ...it,
        procedimentoId: String(it.procedimentoId ?? it.id ?? ''),
        principal: !!it.principal
      };
      arr.push(this.createProcedimentoRow(processedItem));
    });

    const hasPrincipal = arr.controls.some(c => !!c.get('principal')?.value);
    if (!hasPrincipal && arr.length > 0) {
      arr.at(0).get('principal')?.setValue(true);
    }
  }

  private buildProcedimentosFromSurgery(): Array<{ procedimentoId: string; hora: string; principal: boolean }> {
    if (!this.selectedSurgery) {
      console.warn('Nenhuma cirurgia selecionada');
      return [];
    }

    const procs = this.selectedSurgery?.procedures ?? [];

    if (!procs.length) {
      console.warn('Nenhum procedimento encontrado na cirurgia');
      return [];
    }

    const mappedProcedimentos = procs.map((p: any) => {
      const procedimentoId = String(p.id ?? p.procedimentoId ?? '');
      const hora = this.formatTime(p.time ?? p.hora ?? '');
      const principal = !!p.isPrimary;

      return {
        procedimentoId,
        hora,
        principal
      };
    }).filter((p: any) => p.procedimentoId);

    const hasPrincipal = mappedProcedimentos.some((p: { principal: any; }) => p.principal);
    if (!hasPrincipal && mappedProcedimentos.length > 0) {
      mappedProcedimentos[0].principal = true;
      console.log('Nenhum procedimento principal encontrado, marcando o primeiro como principal');
    }

    return mappedProcedimentos;
  }

  private formatTime(time: string | null | undefined): string {
    if (!time) return '';
    return time.substring(0, 5);
  }

  private asArray(value: any): any[] {
    if (Array.isArray(value))
      return value;

    if (value && Array.isArray(value.data))
      return value.data;

    return [];
  }

  private loadDropdownLists(): void {
    const professionals = this.asArray(this.masterData.getProfessionalsCache());
    const procedures = this.asArray(this.masterData.getProceduresCache());
    const medications = this.asArray(this.masterData.getMedicationsCache());

    const mappedProfs = professionals.map((p: any) => ({
      id: String(p.id),
      name: p.name,
      codigo: p.registration || p.login || ''
    }));

    this.equipeLista = mappedProfs;
    this.anestesistasLista = mappedProfs;

    this.procedimentoLista = procedures.map((p: any) => ({
      id: String(p.id),
      name: p.description,
      codigo: p.cid || ''
    }));

    this.medicationsLista = medications.map((m: any) => ({
      id: String(m.id),
      name: m.description
    }));

    if (!this.masterData.hasCache()) {
      this.masterData.downloadMasterData().subscribe({
        next: (res) => {
          this.masterData.saveProfessionals(res.professionals || []);
          this.masterData.saveProcedures(res.procedures || []);
          this.masterData.saveMedications(res.medications || []);
          this.masterData.saveEvents(res.events || []);
          this.loadDropdownLists();
        },
        error: () => this.toast(this.translate.instant('fichaAnestesica.toasts.naoFoiPossivelCarregarListasAghu'), 'warning')
      });
    }
  }

  ddlPos: { top: number; left: number; width: number } | null = null;
  private ddlTriggerEl: HTMLElement | null = null;
  private readonly onViewportChange = () => this.onWindowChange();

  private computeDdlPos(trigger: HTMLElement): { top: number; left: number; width: number } {
    const r = trigger.getBoundingClientRect();
    const MAX_W = Math.min(420, window.innerWidth - 32);
    const MIN_W = Math.min(220, MAX_W);
    const width = Math.max(MIN_W, Math.min(r.width, MAX_W));
    let left = r.left;
    if (left + width > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - 16 - width);
    }
    return { top: r.bottom + 6, left, width };
  }

  toggleDdl(key: string, ev?: Event): void {
    if (!this.canEdit) return;

    const willOpen = this.openDdl !== key;
    this.openDdl = willOpen ? key : null;

    if (this.openDdl && this.ddlFilter[key] == null)
      this.ddlFilter[key] = '';

    if (willOpen && ev) {
      const btn = (ev.currentTarget as HTMLElement) || (ev.target as HTMLElement);
      const trigger = btn?.closest('.ddl-trigger') as HTMLElement | null;
      if (trigger) {
        this.ddlTriggerEl = trigger;
        this.ddlPos = this.computeDdlPos(trigger);
      }
    } else {
      this.ddlTriggerEl = null;
      this.ddlPos = null;
    }
  }


  @HostListener('window:scroll')
  @HostListener('window:resize')
  onWindowChange() {
    if (!this.openDdl || !this.ddlTriggerEl) return;

    if (!document.body.contains(this.ddlTriggerEl)) {
      this.openDdl = null;
      this.ddlPos = null;
      this.ddlTriggerEl = null;
      return;
    }

    this.ddlPos = this.computeDdlPos(this.ddlTriggerEl);
  }

  closeDdl(): void {
    this.openDdl = null;
  }

  isDdlOpen(key: string): boolean {
    return this.openDdl === key;
  }

  setDdlFilter(key: string, value: string): void {
    this.ddlFilter[key] = value ?? '';
  }

  filterList(list: Array<{ id: string; name: string; codigo?: string }>, key: string) {
    const term = (this.ddlFilter[key] || '').trim().toLowerCase();

    if (!term)
      return list;

    return list.filter(item =>
      item.name?.toLowerCase().includes(term) ||
      String(item.id ?? '').toLowerCase().includes(term) ||
      String(item.codigo ?? '').toLowerCase().includes(term)
    );
  }

  selectDdlOption(control: AbstractControl | null, key: string, id: string): void {
    if (!this.canEdit) return;

    console.log(`Selecionando procedimento: ID=${id}, Key=${key}`);
    control?.setValue(id);
    control?.markAsDirty();
    control?.markAsTouched();
    this.ddlFilter[key] = '';
    this.openDdl = null;
  }

  getSelectedLabel(list: Array<{ id: string; name: string; codigo?: string }>, id: any): string {
    if (!id)
      return '';

    const found = list.find(i => String(i.id) === String(id));

    if (!found)
      return '';

    return found.codigo ? `${found.codigo} — ${found.name}` : found.name;
  }

  async openPreAnestesica() {
    const payload = this.preAnesthesicService.getBestAvailable(Number(this.cirurgiaId), this.patientId ?? '');
    if (!payload) {
      this.toast(this.translate.instant('fichaAnestesica.toasts.fichaPreNaoEncontrada'), 'warning');
      return;
    }

    try {
      const data: RecordData = mapPreAnesthesiaToRecordData(payload);

      const modal = await this.modalCtrl.create({
        component: RecordViewerModalComponent,
        componentProps: { data },
        cssClass: 'fa-sheet-modal',
        backdropDismiss: false,
      });
      this.openRecordModal = modal;
      modal.onDidDismiss().then(() => {
        if (this.openRecordModal === modal) this.openRecordModal = undefined;
      });
      await modal.present();
    } catch (e) {
      console.error('Erro ao abrir Ficha Pré-Anestésica', e);
      this.toast(this.translate.instant('fichaAnestesica.toasts.erroAbrirFichaPre'), 'danger');
    }
  }


  private fieldLabels: Record<string, string> = {};

  private sectionLabels: Record<string, string> = {};

  private getMissingFields(): Array<{ section: string; label: string; path: string }> {
    const missing: Array<{ section: string; label: string; path: string }> = [];

    const walk = (control: AbstractControl, path: string) => {
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(k =>
          walk(control.controls[k], path ? `${path}.${k}` : k)
        );
      } else if (control instanceof FormArray) {
        control.controls.forEach((c, i) => walk(c, `${path}[${i}]`));
      } else {
        if (control.invalid) {
          const section = path.split('.')[0];
          missing.push({
            section: this.sectionLabels[section] || section,
            label: this.fieldLabels[path] || path,
            path,
          });
        }
      }
    };

    walk(this.form, '');

    const ald = this.form.get('alderete') as FormGroup;
    if (ald?.errors?.['dorScaleRequired']) {
      missing.push({
        section: this.sectionLabels['alderete'],
        label: this.translate.instant('fichaAnestesica.missing.escalaDorRequired'),
        path: 'alderete.escala',
      });
    }
    if (ald?.errors?.['dorScaleInvalid']) {
      missing.push({
        section: this.sectionLabels['alderete'],
        label: this.translate.instant('fichaAnestesica.missing.escalaDorInvalid'),
        path: 'alderete.escala',
      });
    }

    const procs = this.procedimentosArray;
    if (procs.length === 0 || procs.controls.every(c => !c.get('procedimentoId')?.value)) {
      missing.push({
        section: this.sectionLabels['posProcedimento'],
        label: this.translate.instant('fichaAnestesica.missing.procedimentoRequired'),
        path: 'posProcedimento.procedimentos',
      });
    }

    return missing;
  }

  private scrollToFirstInvalid(): void {

    const el =
      document.querySelector('.shake-error') ||
      document.querySelector('.ng-invalid.ng-touched');
    if (el && (el as HTMLElement).scrollIntoView) {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

  }


  async handleRefresh(event: any) {
    try {
      await this.refreshData();
      this.toast(this.translate.instant('fichaAnestesica.toasts.dadosRecarregados'), 'success');
    } catch (error) {
      console.error('Erro ao recarregar:', error);
      this.toast(this.translate.instant('fichaAnestesica.toasts.falhaRecarregarDados'), 'danger');
    } finally {
      event.target.complete();
    }
  }



  private async refreshData(): Promise<void> {
    if (!this.cirurgiaId || !this.patientId) return;

    this.showValidationErrors = false;
    this.isLoading = true;

    try {
      await this.masterData.downloadMasterData().toPromise();
      this.loadDropdownLists();
      await this.loadPatientData(this.cirurgiaId, this.patientId);
    } catch (err) {
      console.warn('Falha ao recarregar dados mestres', err);
    } finally {
      this.isLoading = false;
    }
  }
}