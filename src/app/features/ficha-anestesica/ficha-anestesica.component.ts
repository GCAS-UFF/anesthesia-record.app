import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { AlertController, ToastController, IonContent, IonRefresherContent, IonRefresher } from '@ionic/angular/standalone';
import { IonButton, IonIcon, IonCheckbox, IonSpinner, IonModal } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, ValidationErrors, Validators } from '@angular/forms';

import { debounceTime, Subscription } from 'rxjs';
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


@Component({
  selector: 'app-ficha-anestesica',
  standalone: true,
  imports: [IonRefresher, IonRefresherContent, IonContent,
    CommonModule,
    IonButton,
    IonIcon,
    IonCheckbox,
    IonSpinner,
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

  isPreViewerOpen = false;
  preAnesthesiaData: any = null;

  medicationsLista: { id: string; name: string; codigo?: string }[] = [];

  isMenuOpen = false;

  @HostListener('document:ionDidOpen', ['$event'])
  onSideMenuOpen(ev: Event) {
    const tag = (ev.target as HTMLElement | null)?.tagName?.toLowerCase();
    if (tag === 'ion-menu') this.isMenuOpen = true;
  }

  @HostListener('document:ionDidClose', ['$event'])
  onSideMenuClose(ev: Event) {
    const tag = (ev.target as HTMLElement | null)?.tagName?.toLowerCase();
    if (tag === 'ion-menu') this.isMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent) {
    if (!this.openDdl) return;
    const target = ev.target as HTMLElement | null;
    if (target && !target.closest('.ddl')) this.openDdl = null;
  }

  viaPreOptions = [
    { label: 'VO', value: 'VO' },
    { label: 'IM', value: 'IM' },
    { label: 'IV', value: 'IV' },
    { label: 'OUTRAS', value: 'Outras' }
  ];

  posicaoOptions = [
    { label: 'Supina', value: 'SUPINA' },
    { label: 'Prona', value: 'PRONA' },
    { label: 'Sentado', value: 'SENTADO' },
    { label: 'Lateral Esq.', value: 'LATERAL ESQUERDO' },
    { label: 'Lateral Dir.', value: 'LATERAL DIREITO' },
    { label: 'Trendelenburg', value: 'TRENDELENBURG' },
    { label: 'Litotômica', value: 'LITOTÔMICA' }
  ];

  acessoVenosoOptions = [
    { label: 'Periférico', value: 'Periferico' },
    { label: 'Central', value: 'Central' }
  ];

  condicoesAltaOptions = [
    { label: 'Acordado', value: 'Acordado' },
    { label: 'Sonolento', value: 'Sonolento' },
    { label: 'Intubado', value: 'Intubado' }
  ];

  yesNoOptions = [{ label: 'Sim', value: 'sim' }, { label: 'Não', value: 'nao' }];

  aldereteFields = [
    {
      label: 'Consciência', control: 'consciencia', icon: '🧠',
      options: [
        { score: 2, text: 'Totalmente desperto' },
        { score: 1, text: 'Desperta quando chamado' },
        { score: 0, text: 'Não responde' }
      ]
    },
    {
      label: 'Atividade', control: 'atividade', icon: '🏃',
      options: [
        { score: 2, text: 'Movimento de todas extremidades' },
        { score: 1, text: 'Movimento de duas extremidades' },
        { score: 0, text: 'Incapaz de se mover' }
      ]
    },
    {
      label: 'Circulação', control: 'circulacao', icon: '❤️',
      options: [
        { score: 2, text: 'PA ± 20% do pré-anestésico' },
        { score: 1, text: 'PA 20% a 50% do pré-anestésico' },
        { score: 0, text: 'PA ± 50% do pré-anestésico' }
      ]
    },
    {
      label: 'Respiração', control: 'respiracao', icon: '🫁',
      options: [
        { score: 2, text: 'Respira profundamente e tosse' },
        { score: 1, text: 'Dispnéia, hipoventilação' },
        { score: 0, text: 'Apneia' }
      ]
    },
    {
      label: 'SpO2', control: 'saturacao', icon: '🩸',
      options: [
        { score: 2, text: 'Mantém SpO2 > 90% em ar ambiente' },
        { score: 1, text: 'Necessita O2 para SpO2 > 90%' },
        { score: 0, text: 'SpO2 < 90% mesmo com O2' }
      ]
    }
  ];

  antibioticsList: any[] = [];
  isLoading = false;
  isSaving = false;
  showValidationErrors = false;

  isSignModalOpen = false;
  signatureAgreed = false;
  signatureTypedName = '';
  signatureError = '';

  private autoSaveSub?: Subscription;
  private conditionalSubs: Subscription[] = [];


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
    private masterData: MasterDataService
  ) {
    addIcons({ checkmarkCircle, chevronDownOutline, addOutline, trashOutline, returnDownForwardOutline, closeCircleOutline, timeOutline, alertCircleOutline, lockClosedOutline, shieldCheckmarkOutline, syncOutline, printOutline, fitnessOutline, createOutline, medicalSharp, shieldCheckmark, cloudDoneOutline, pencilOutline, saveOutline, arrowBackOutline, closeOutline });
    this.initForm();

    // Chamar isso junto com o carregamento da ficha quando estiver pronto, pois SEMPRE vamos ter a pre anestésica preenchida
    // this.preAnesthesiaData = response.preAnesthesia ?? null;
  }

  ngOnInit() {
    this.loggedUser = this.authService.getUser();
    this.cirurgiaId = this.route.snapshot.paramMap.get('id');
    this.patientId = this.route.snapshot.paramMap.get('patientId');
    this.loadDropdownLists();

    if (this.cirurgiaId && this.patientId) {
      this.loadPatientData(this.cirurgiaId, this.patientId);
      this.tentarReenviarRascunho();
    }

    this.setupConditionalLogic();
    this.startAutoSave();
  }

  ngOnDestroy() {
    this.conditionalSubs.forEach(sub => sub.unsubscribe());
  }

  private startAutoSave() {
    this.autoSaveSub?.unsubscribe();
    this.autoSaveSub = this.form.valueChanges
      .pipe(debounceTime(1500))
      .subscribe(() => {
        if (this.isReadOnlyRecord)
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
    if (dorControl?.invalid) return true;
    if (!this.isDorPresente()) return false;

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
      this.toast('Selecione o antibiótico e informe a Dose.', 'warning');
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
      return { text: 'Apto para Alta', color: '#10b981' };

    if (s >= 5)
      return { text: 'Em Observação', color: '#f59e0b' };

    return { text: 'Monitoramento Intenso', color: '#ef4444' };
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
        segundoAnestesistaId: draftData.assinaturas?.segundoAnestesistaId || null
      },
      firstAnesthesiologistId: this.loggedUser?.id ? String(this.loggedUser.id) : draftData.firstAnesthesiologistId || null,
      secondAnesthesiologistId: draftData.secondAnesthesiologistId || null
    };

    this.anesthesiaService.saveDraft(this.cirurgiaId, formattedData);
  }

  private async tentarReenviarRascunho() {
    if (this.isReadOnlyRecord)
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

      const record = this.buildPayload();

      this.form.patchValue(originalFormValue);
      this.antibioticsList = originalAntibioticsList;

      this.isSaving = true;
      this.anesthesiaService.saveRecord(record).subscribe({
        next: async () => {
          this.anesthesiaService.clearDraft(this.cirurgiaId!);
          this.isSaving = false;
          this.toast('Rascunho reenviado com sucesso!', 'success');
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
      this.surgeryService.getPatientDate(Number(id), patientId).subscribe({
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
            ?? surgeryData.patient.surgeries?.[0];

          this.isCancelled = surgeryData.patient.status === SurgeryStatusEnum.Cancelada;

          const firstAnesthesiologistId = surgeryData.firstAnesthesiologistId;

          this.isReadOnlyRecord = !!firstAnesthesiologistId && firstAnesthesiologistId !== this.loggedUser?.id;
          this.canEdit = !this.isReadOnlyRecord;

          const draft = this.anesthesiaService.getDraft(this.cirurgiaId!);
          this.anesthesiaService.getLatestByPatient(this.cirurgiaId!, patientId).subscribe({
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
                console.log('Procedimentos construídos:', procedimentosFromSurgery);
                this.hydrateProcedimentos(procedimentosFromSurgery);
                this.form.get('dadosVitais.peso')?.patchValue(this.patient.weightKg);
              }
              this.isLoading = false;
              resolve();
            },
            error: (err) => {
              this.isLoading = false;
              reject(err);
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

  private formatDate(dateStr: string): string {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private async toast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const t = await this.toastController.create({ message, duration: 2500, color, position: 'top' });
    await t.present();
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
      this.form.get('dadosVitais.peso')?.patchValue(this.patient.weight);
    }

    if (this.cirurgiaId) {
      this.anesthesiaService.clearLatestRecord(this.cirurgiaId).subscribe({
        next: () => { },
        error: () => this.toast('Rascunho local limpo. Falhou ao limpar no servidor.', 'warning')
      });
    }

    this.toast('Formulário limpo.', 'success');

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
        header: 'Campos obrigatórios não preenchidos',
        subHeader: `${missing.length} pendência(s) encontrada(s)`,
        message: 'Verifique os campos destacados em vermelho.',
        cssClass: 'validation-alert',
        buttons: [{
          text: 'Entendi',
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
    this.signatureError = '';
    this.isSignModalOpen = true;
  }

  closeSignModal() {
    this.isSignModalOpen = false;
  }

  get expectedSignatureName(): string {
    return (this.loggedUser?.name || this.loggedUser?.fullName || '').trim();
  }

  confirmarESalvar() {
    this.signatureError = '';
    if (!this.signatureAgreed) {
      this.signatureError = 'Você precisa marcar a confirmação de veracidade dos dados.';
      return;
    }

    const typed = this.signatureTypedName.trim();
    const expected = this.expectedSignatureName;
    if (!typed) {
      this.signatureError = 'Digite seu nome completo para assinar.';
      return;
    }
    if (expected && typed.toLowerCase() !== expected.toLowerCase()) {
      this.signatureError = `O nome digitado não confere com o do profissional logado (${expected}).`;
      return;
    }

    this.form.get('assinaturas.primeiroAnestesista')?.setValue(typed);
    this.form.get('assinaturas.dataAssinatura')?.setValue(new Date().toISOString().split('T')[0]);
    this.isSignModalOpen = false;
    this.executarSalvamento();
  }

  private executarSalvamento() {
    this.isSaving = true;
    const record = this.buildPayload();

    const formattedRecord = {
      ...record,
      patientId: record.pacienteId ? String(record.pacienteId) : this.patientId ? String(this.patientId) : null,
      cirurgiaId: this.cirurgiaId ? String(this.cirurgiaId) : null,
      surgeryId: this.selectedSurgery?.id ? String(this.selectedSurgery.id) : null,
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
        this.toast('Ficha Anestésica assinada e salva com sucesso!', 'success');
      },
      error: async (error) => {
        this.isSaving = false;

        this.persistDraft({
          ...this.form.value,
          antibioticsList: this.antibioticsList,
          _error: error?.message || 'Erro ao salvar ficha',
          _timestamp: new Date().toISOString()
        });

        this.toast('Não foi possível enviar a ficha para o servidor nesse momento. Um rascunho foi salvo para tentativa de reenvio.', 'warning');
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
    }
  }

  voltar() {
    this.location.back();
  }

  async irParaCirurgia(): Promise<void> {
    if (!this.selectedSurgery?.id) {
      return;
    }

    this.router.navigate(['/monitorizacao', this.selectedSurgery.id]);
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
    this.procedimentosArray.push(this.createProcedimentoRow());
  }

  removeProcedimento(index: number): void {
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
          this.loadDropdownLists();
        },
        error: () => this.toast('Não foi possível carregar as listas do AGHU.', 'warning')
      });
    }
  }

  ddlPos: { top: number; left: number; width: number } | null = null;

  toggleDdl(key: string, ev?: Event): void {
    const willOpen = this.openDdl !== key;
    this.openDdl = willOpen ? key : null;

    if (this.openDdl && this.ddlFilter[key] == null)
      this.ddlFilter[key] = '';

    if (willOpen && ev) {
      const btn = (ev.currentTarget as HTMLElement) || (ev.target as HTMLElement);
      const trigger = btn?.closest('.ddl-trigger') as HTMLElement | null;
      if (trigger) {
        const r = trigger.getBoundingClientRect();
        const MAX_W = Math.min(420, window.innerWidth - 32);
        const MIN_W = Math.min(220, MAX_W);
        const width = Math.max(MIN_W, Math.min(r.width, MAX_W));
        let left = r.left;
        if (left + width > window.innerWidth - 16) {
          left = Math.max(16, window.innerWidth - 16 - width);
        }
        this.ddlPos = { top: r.bottom + 6, left, width };
      }
    } else {
      this.ddlPos = null;
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onWindowChange() {
    if (this.openDdl) {
      this.openDdl = null;
      this.ddlPos = null;
    }
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

  openPreAnestesica() {
    if (!this.preAnesthesiaData) {
      // opcional: chamar toast avisando "Ficha pré-anestésica não disponível"
    }
    this.isPreViewerOpen = true;
  }

  closePreAnestesica() {
    this.isPreViewerOpen = false;
  }


  private fieldLabels: Record<string, string> = {
    'seguranca.identificadoAvaliado': 'Paciente identificado e avaliado',
    'seguranca.consentimentoAssinado': 'Termo de consentimento assinado',
    'seguranca.equipamentosChecados': 'Equipamentos checados',
    'preInducao.recebeuMedPrevia': 'Recebeu medicação pré-anestésica',
    'antibiotico.temAntibiotico': 'Uso de antibiótico profilático',
    'dadosVitais.pa': 'PA',
    'dadosVitais.fr': 'FR',
    'dadosVitais.temp': 'Temperatura',
    'dadosVitais.spo2': 'SpO₂',
    'dadosVitais.peso': 'Peso',
    'dadosVitais.asa': 'ASA',
    'dadosVitais.entradaSala': 'Entrada na Sala',
    'equipe.cirurgiao': 'Cirurgião',
    'equipe.assistente': 'Assistente',
    'equipe.diagnosticoPre': 'Diagnóstico Pré',
    'equipe.horaInicioAnestesia': 'Hora de início da anestesia',
    'posicao.usoCoxim': 'Uso de coxim',
    'posicao.dificuldadePuncao': 'Dificuldade de punção',
    'tecnica.anestesiaGeral': 'Anestesia geral (Sim/Não)',
    'tecnica.circuitoAbsorvedor': 'Circuito absorvedor de CO₂',
    'tecnica.bloqueiosEspinhais': 'Bloqueios espinhais (Sim/Não)',
    'tecnica.cateter': 'Cateter (bloqueio espinhal)',
    'tecnica.opioide': 'Opioide (bloqueio espinhal)',
    'tecnica.sedacao': 'Sedação (Sim/Não)',
    'tecnica.suplementacaoO2': 'Suplementação de O₂',
    'tecnica.bloqueioPlexo': 'Bloqueio de plexo (Sim/Não)',
    'tecnica.neuroestimulador': 'Neuroestimulador',
    'posProcedimento.horaTerminoCirurgia': 'Hora de término da cirurgia',
    'posProcedimento.diagnosticoPos': 'Diagnóstico pós',
    'posProcedimento.horaTerminoAnestesia': 'Hora de término da anestesia',
    'alderete.dor': 'Presença de dor (Sim/Não)',
    'alderete.dorENV': 'Escala ENV (0–10)',
    'alderete.dorPAINAD': 'Escala PAINAD (0–10)',
    'alderete.dorBPS': 'Escala BPS (3–12)',
    'assinaturas.dataAssinatura': 'Data da assinatura',
  };

  private sectionLabels: Record<string, string> = {
    seguranca: 'Segurança do Paciente',
    preInducao: 'Pré-Indução',
    antibiotico: 'Antibiótico Profilático',
    dadosVitais: 'Dados Vitais',
    equipe: 'Equipe Cirúrgica',
    posicao: 'Posição e Acesso',
    tecnica: 'Técnica Anestésica',
    posProcedimento: 'Pós-Procedimento',
    alderete: 'Aldrete e Dor',
    assinaturas: 'Assinaturas',
  };

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
        section: 'Aldrete e Dor',
        label: 'Selecione ao menos uma escala de dor (ENV / PAINAD / BPS)',
        path: 'alderete.escala',
      });
    }
    if (ald?.errors?.['dorScaleInvalid']) {
      missing.push({
        section: 'Aldrete e Dor',
        label: 'Valor da escala de dor fora do intervalo permitido',
        path: 'alderete.escala',
      });
    }

    const procs = this.procedimentosArray;
    if (procs.length === 0 || procs.controls.every(c => !c.get('procedimentoId')?.value)) {
      missing.push({
        section: 'Pós-Procedimento',
        label: 'Informe ao menos um procedimento realizado',
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
      this.toast('Dados recarregados com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao recarregar:', error);
      this.toast('Falha ao recarregar os dados', 'danger');
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
    } catch (err) {
      console.warn('Falha ao recarregar dados mestres', err);
    }

    await this.loadPatientData(this.cirurgiaId, this.patientId);
  }
}