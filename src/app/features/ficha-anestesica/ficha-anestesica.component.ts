import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { IonButton, IonIcon, IonCheckbox, IonSpinner, IonModal } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, ValidationErrors, Validators } from '@angular/forms';

import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
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
  alertCircleOutline, cloudDoneOutline
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


@Component({
  selector: 'app-ficha-anestesica',
  standalone: true,
  imports: [
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
    DadosVitaisSectionComponent
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
    addIcons({ checkmarkCircle, addOutline, trashOutline, returnDownForwardOutline, closeCircleOutline, timeOutline, alertCircleOutline, lockClosedOutline, shieldCheckmarkOutline, syncOutline, printOutline, shieldCheckmark, cloudDoneOutline, createOutline, pencilOutline, saveOutline, arrowBackOutline, closeOutline, chevronDownOutline });
    this.initForm();
  }

  ngOnInit() {
    this.loggedUser = this.authService.getUser();
    this.cirurgiaId = this.route.snapshot.paramMap.get('id');
    this.patientId = this.route.snapshot.paramMap.get('patientId');
    this.loadDropdownLists();
    if (this.cirurgiaId && this.patientId) {
      this.loadPatientData(this.cirurgiaId, this.patientId);
    }
    this.setupConditionalLogic();
    this.startAutoSave();
  }

  ngOnDestroy() {
    this.autoSaveSub?.unsubscribe();
    this.conditionalSubs.forEach(sub => sub.unsubscribe());
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
        hora: [''], farmaco: [''], via: [''], outrasVia: ['']
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
  newAtb: any = { nome: '', dose: '', via: 'IV', hora: '' };

  startAddAtb() {
    this.addingAtb = true;
    this.newAtb = {
      nome: '', dose: '', via: 'IV',
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  cancelAddAtb() { this.addingAtb = false; }

  confirmAddAtb() {
    if (!this.newAtb.nome?.trim() || !this.newAtb.dose?.trim()) {
      this.toast('Informe pelo menos Nome e Dose.', 'warning');
      return;
    }
    this.antibioticsList = [
      ...this.antibioticsList,
      {
        nome: this.newAtb.nome.trim(),
        dose: this.newAtb.dose.trim(),
        via: (this.newAtb.via || 'IV').trim(),
        hora: this.newAtb.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temRepique: 'nao',
        repiques: []
      }
    ];
    this.addingAtb = false;
    this.persistDraft();
  }

  toggleRepique(index: number, value: string) {
    this.antibioticsList[index].temRepique = value;
    if (value === 'sim' && this.antibioticsList[index].repiques.length === 0) {
      this.adicionarRepique(index);
    } else if (value === 'nao') {
      this.antibioticsList[index].repiques = [];
    }
    this.persistDraft();
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
              this.persistDraft();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  removerAntibiotico(index: number) {
    this.antibioticsList.splice(index, 1);
    this.persistDraft();
  }

  removerRepique(atbIndex: number, repiqueIndex: number) {
    this.antibioticsList[atbIndex].repiques.splice(repiqueIndex, 1);
    this.persistDraft();
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
    if (s >= 8) return { text: 'Apto para Alta', color: '#10b981' };
    if (s >= 5) return { text: 'Em Observação', color: '#f59e0b' };
    return { text: 'Monitoramento Intenso', color: '#ef4444' };
  }

  getFormGroup(name: string): FormGroup {
    return this.form.get(name) as FormGroup;
  }

  isSectionInvalid(name: string): boolean {
    const g = this.form.get(name);
    return !!(g && g.invalid && (g.touched || this.showValidationErrors));
  }

  private persistDraft() {
    if (!this.cirurgiaId) return;
    this.anesthesiaService.saveDraft(this.cirurgiaId, {
      ...this.form.value,
      antibioticsList: this.antibioticsList
    });
  }

  private startAutoSave() {
    this.autoSaveSub?.unsubscribe();
    this.autoSaveSub = this.form.valueChanges
      .pipe(debounceTime(1500))
      .subscribe(() => { if (!this.isSaving) this.persistDraft(); });
  }

  private loadPatientData(id: string, patientId: string) {
    this.isLoading = true;
    this.surgeryService.getPatientDate(Number(id), patientId).subscribe((res: any) => {
      const surgeryData = res?.data;
      if (!surgeryData?.patient) { this.isLoading = false; return; }
      const patient = surgeryData.patient;
      this.isCancelled = patient.status;
      this.canEdit = surgeryData.firstAnesthesiologistId === this.loggedUser?.id;

      this.patient = {
        ...patient,
        gender: patient.gender || 'M',
        weight: (patient.weightKg ?? '').toString(),
        birthDate: this.formatDate(patient.birthDate)
      };
      this.selectedSurgery = patient.surgeries?.find((x: any) => x.id === surgeryData.surgeryId)
        ?? patient.surgeries?.[0];
      this.selectedProcedure = this.selectedSurgery?.procedures?.find((p: any) => p.isPrimary)
        ?? this.selectedSurgery?.procedures?.[0];

      const draft = this.anesthesiaService.getDraft(this.cirurgiaId!);
      this.anesthesiaService.getLatestByPatient(this.cirurgiaId!, patientId).subscribe(savedRecord => {
        if (draft) {
          this.hydrateProcedimentos((draft as any)?.posProcedimento?.procedimentos);
          this.form.patchValue(draft);
          if (draft.antibioticsList) this.antibioticsList = draft.antibioticsList;
        } else if (savedRecord) {
          this.hydrateProcedimentos((savedRecord as any)?.posProcedimento?.procedimentos);
          this.form.patchValue(savedRecord);
          if ((savedRecord as any).antibioticsList) this.antibioticsList = (savedRecord as any).antibioticsList;
        } else {
          this.hydrateProcedimentos(this.buildProcedimentosFromSurgery());
          this.form.get('dadosVitais.peso')?.patchValue(patient.weightKg);
        }
        this.isLoading = false;
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
    this.startAutoSave();

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

  openSignModal() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showValidationErrors = true;
      setTimeout(() => (this.showValidationErrors = false), 1000);
      this.toast('Preencha todos os campos obrigatórios (*) antes de assinar.', 'warning');
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

    this.anesthesiaService.saveRecord(record).subscribe({
      next: async () => {
        this.anesthesiaService.clearDraft(this.cirurgiaId!);
        this.isSaving = false;
        this.toast('Ficha Anestésica assinada e salva com sucesso!', 'success');
      },
      error: async () => {
        this.isSaving = false;
        this.toast('Erro ao salvar ficha. Tente novamente.', 'danger');
      }
    });
  }

  private buildPayload(): AnesthesiaRecordModel {
    const raw = this.form.value;

    const resolveProfessional = (id: any) => {
      if (!id) return null;
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

    return {
      ...raw,
      cirurgiaId: this.cirurgiaId,
      patientId: this.patientId,
      surgeryId: this.selectedSurgery?.id ?? null,
      antibioticsList: this.antibioticsList,
      cirurgias: procedimentos,
      surgeryPerformed: primaryProc?.description ?? '',
      firstAnesthesiologistId: primeiroResolved?.id ?? this.loggedUser?.id ?? 0,
      firstAnesthesiologistName: primeiroResolved?.name ?? raw.assinaturas?.primeiroAnestesista ?? '',
      secondAnesthesiologistId: segundoResolved?.id ?? null,
      secondAnesthesiologistName: segundoResolved?.name ?? null,
      equipe: {
        ...raw.equipe,
        cirurgiao: resolveProfessional(raw.equipe?.cirurgiao),
        assistente: resolveProfessional(raw.equipe?.assistente)
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
 
  async finalizarCirurgia(): Promise<void> {
    if (!this.selectedSurgery?.id) {
      return;
    }

    console.log('[finalizarCirurgia] TODO: implementar', this.selectedSurgery.id);
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

  private hydrateProcedimentos(items?: Array<{ procedimentoId?: string; hora?: string; principal?: boolean }> | null): void {
    if (!items || !items.length) return;
    const arr = this.procedimentosArray;
    while (arr.length) arr.removeAt(0);
    items.forEach(it => arr.push(this.createProcedimentoRow(it)));
    const hasPrincipal = arr.controls.some(c => !!c.get('principal')?.value);
    if (!hasPrincipal) arr.at(0).get('principal')?.setValue(true);
  }

  private buildProcedimentosFromSurgery(): Array<{ procedimentoId: string; hora: string; principal: boolean }> {
    const procs = this.selectedSurgery?.procedures ?? [];
    if (!procs.length) return [];
    return procs.map((p: any) => ({
      procedimentoId: String(p.id ?? p.procedimentoId ?? ''),
      hora: p.hora ?? '',
      principal: !!p.isPrimary
    })).filter((p: any) => p.procedimentoId);
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

  toggleDdl(key: string): void {
    this.openDdl = this.openDdl === key ? null : key;

    if (this.openDdl && this.ddlFilter[key] == null)
      this.ddlFilter[key] = '';
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
}
