import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonModal,
  IonCheckbox,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  saveOutline,
  cloudDoneOutline,
  medkitOutline,
  fitnessOutline,
  heartOutline,
  bodyOutline,
  warningOutline,
  alertCircleOutline,
  documentTextOutline,
  medicalOutline,
  addCircleOutline,
  trashOutline,
  closeOutline,
  chevronBackOutline,
  checkmarkCircleOutline,
  shieldCheckmarkOutline,
  createOutline,
  closeCircleOutline,
  lockClosedOutline,
  readerOutline,
} from 'ionicons/icons';

import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { HeaderActionButton } from '../../shared/components/header-institucional/header-action-button.model';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { AuthService } from '../../core/services/auth.service';
import { PreAnesthesicRecordService } from '../../core/services/pre-anesthesic-record.service';
import {
  ChecklistGroupDef,
  ChecklistOption,
  COMORBIDITY_GROUPS,
  PHYSICAL_EXAM_GROUPS,
  DRUG_OPTIONS,
  ALLERGY_OPTIONS,
  CONDUCT_OPTIONS,
  ASA_OPTIONS,
  MALLAMPATI_OPTIONS,
  LATERALITY_OPTIONS,
  MUCOSA_OPTIONS,
  DENTITION_OPTIONS,
  INTER_INCISOR_DISTANCE_OPTIONS,
  UPPER_INCISOR_LENGTH_OPTIONS,
  INCISOR_RELATION_OPTIONS,
  PALATE_OPTIONS,
  YES_NO_NA_OPTIONS,
  NECK_LENGTH_OPTIONS,
  NECK_WIDTH_OPTIONS,
  STERNOMENTAL_DISTANCE_OPTIONS,
  THYROMENTAL_DISTANCE_OPTIONS,
  NORMAL_ABNORMAL_OPTIONS,
  HUAP_SPECIALTY_OPTIONS,
  PreAnesthesicRecordDraft,
  PreAnesthesicRecordPayload,
  PreAnesthesicChecklistFinding,
} from '../../shared/models/pre-anesthesic-record.model';

interface PreAnesthesiaSection {
  id: string;
  index: number;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-pre-anesthesic-record',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonSpinner,
    IonModal,
    IonCheckbox,
    HeaderInstitucionalComponent,
    StatusBarComponent,
  ],
  templateUrl: './pre-anesthesic-record.html',
  styleUrls: ['./pre-anesthesic-record.component.scss'],
})
export class FichaPreAnestesicaComponent implements OnInit, OnDestroy {
  form!: FormGroup;

  patientId: string | null = null;
  anesthesiaRecordId: number | null = null;
  private remoteRecordId: number | null = null;
  patient: any = null;

  isSaving = false;
  isLoadingRecord = false;

  isSignModalOpen = false;
  signatureAgreed = false;
  signaturePassword = '';
  signatureError = '';

  loggedUser: any = null;
  lastSavedAt: Date | null = null;
  
  isFinalized = false;
  forcedReadOnly = false;
  isResponsible = true;

  get canEdit(): boolean {
    return !this.isFinalized && !this.forcedReadOnly && this.isResponsible;
  }

  private isSubmittingSignature = false;
  private pendingFinalizePayload: PreAnesthesicRecordPayload | null = null;
  private syncTimerSub?: Subscription;
  private formSub?: Subscription;

  activeSectionId = 'procedimento';

  readonly asaOptions = ASA_OPTIONS;
  readonly mallampatiOptions = MALLAMPATI_OPTIONS;
  readonly lateralidadeOptions = LATERALITY_OPTIONS;

  readonly mucosasOptions = MUCOSA_OPTIONS;
  readonly denticaoOptions = DENTITION_OPTIONS;
  readonly interIncisivosOptions = INTER_INCISOR_DISTANCE_OPTIONS;
  readonly incisivosSuperioresOptions = UPPER_INCISOR_LENGTH_OPTIONS;
  readonly relacaoIncisivosOptions = INCISOR_RELATION_OPTIONS;
  readonly palatoOptions = PALATE_OPTIONS;
  readonly yesNoNaOptions = YES_NO_NA_OPTIONS;
  readonly pescocoComprimentoOptions = NECK_LENGTH_OPTIONS;
  readonly pescocoLarguraOptions = NECK_WIDTH_OPTIONS;
  readonly esternoMentonianaOptions = STERNOMENTAL_DISTANCE_OPTIONS;
  readonly tireomentonianaOptions = THYROMENTAL_DISTANCE_OPTIONS;
  readonly normalAnormalOptions = NORMAL_ABNORMAL_OPTIONS;
  readonly especialidadesHuap = HUAP_SPECIALTY_OPTIONS;

  readonly cirurgiasAghu: string[] = [
    'Colecistectomia videolaparoscópica',
    'Herniorrafia inguinal',
    'Herniorrafia umbilical',
    'Apendicectomia',
    'Histerectomia total abdominal',
    'Cesariana',
    'Curetagem uterina',
    'Artroplastia total de quadril',
    'Artroplastia total de joelho',
    'Osteossíntese de fêmur',
    'Prostatectomia',
    'Ressecção transuretral de próstata (RTU)',
    'Nefrolitotripsia',
    'Tireoidectomia',
    'Mastectomia',
    'Facectomia com implante de LIO',
    'Amigdalectomia',
    'Septoplastia',
    'Laparotomia exploradora',
    'Gastrectomia',
    'Colectomia',
    'Craniotomia',
    'Laminectomia / Artrodese de coluna',
    'Safenectomia / Varizes de MMII',
  ];

  readonly comorbidadeGroups: ChecklistGroupDef[] = COMORBIDITY_GROUPS;
  readonly exameFisicoGroups: ChecklistGroupDef[] = PHYSICAL_EXAM_GROUPS;
  readonly drogasOptions: ChecklistOption[] = DRUG_OPTIONS;
  readonly alergiaOptions: ChecklistOption[] = ALLERGY_OPTIONS;
  readonly condutaOptions: ChecklistOption[] = CONDUCT_OPTIONS;

  readonly sections: PreAnesthesiaSection[] = [
    { id: 'procedimento', index: 1, title: 'Procedimento', icon: 'medkit-outline' },
    { id: 'antropometria', index: 2, title: 'Antropometria e Sinais Vitais', icon: 'fitness-outline' },
    { id: 'comorbidades', index: 3, title: 'Comorbidades', icon: 'heart-outline' },
    { id: 'habitos', index: 4, title: 'Hábitos', icon: 'warning-outline' },
    { id: 'alergias', index: 5, title: 'Alergias e Reações Adversas', icon: 'alert-circle-outline' },
    { id: 'medicacoes', index: 6, title: 'Medicações em uso', icon: 'medical-outline' },
    { id: 'exame-fisico', index: 7, title: 'Exame Físico', icon: 'body-outline' },
    { id: 'exames', index: 8, title: 'Exames Complementares e Pareceres', icon: 'document-text-outline' },
    { id: 'conduta', index: 9, title: 'Classificação e Conduta', icon: 'checkmark-circle-outline' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private toastCtrl: ToastController,
    private authService: AuthService,
    private preAnesthesicService: PreAnesthesicRecordService,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      arrowBackOutline,
      saveOutline,
      cloudDoneOutline,
      medkitOutline,
      fitnessOutline,
      heartOutline,
      bodyOutline,
      warningOutline,
      alertCircleOutline,
      documentTextOutline,
      medicalOutline,
      addCircleOutline,
      trashOutline,
      closeOutline,
      chevronBackOutline,
      checkmarkCircleOutline,
      shieldCheckmarkOutline,
      createOutline,
      closeCircleOutline,
      lockClosedOutline,
      readerOutline,
    });
  }

  ngOnInit(): void {
    
    const rawAnesthesiaRecordId = this.route.snapshot.paramMap.get('id');
    this.anesthesiaRecordId = rawAnesthesiaRecordId ? Number(rawAnesthesiaRecordId) : null;
    this.patientId = this.route.snapshot.paramMap.get('patientId');
    this.forcedReadOnly = this.route.snapshot.queryParamMap.get('readOnly') === 'true';
    this.loggedUser = this.authService.getUser();
    this.buildForm();
    this.loadInitialState();
    this.setupScrollSpy();
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
    this.syncTimerSub?.unsubscribe();
    const sc = document.querySelector('.pre-scroll');
    sc?.removeEventListener('scroll', this.onScroll);
  }

  private checkGroup(def: ChecklistGroupDef): FormGroup {
    const controls: Record<string, any> = {};
    def.options.forEach((o) => (controls[o.key] = [false]));
    controls['outrosDescricao'] = [''];
    controls['observacoes'] = [''];
    return this.fb.group(controls);
  }

  private buildForm(): void {
    const comorbidades: Record<string, FormGroup> = {};
    this.comorbidadeGroups.forEach((g) => (comorbidades[g.key] = this.checkGroup(g)));

    const exameGroups: Record<string, FormGroup> = {};
    this.exameFisicoGroups.forEach((g) => (exameGroups[g.key] = this.checkGroup(g)));

    const drogasTipos: Record<string, any> = {};
    this.drogasOptions.forEach((o) => (drogasTipos[o.key] = [false]));

    const alergiaTipos: Record<string, any> = {};
    this.alergiaOptions.forEach((o) => (alergiaTipos[o.key] = [false]));

    const condutas: Record<string, any> = {};
    this.condutaOptions.forEach((o) => (condutas[o.key] = [false]));

    this.form = this.fb.group({
      procedimento: this.fb.group({
        cirurgias: this.fb.array([] as any[]),
        lateralidade: [''],
        diagnosticoPreOperatorio: [''],
        dataConsulta: [new Date().toISOString().slice(0, 16)],
        observacao: [''],
      }),

      antropometria: this.fb.group({
        peso: [null],
        altura: [null],
        imc: [{ value: null, disabled: true }],
        frequenciaCardiaca: [null],
        pressaoSistolica: [null],
        pressaoDiastolica: [null],
        saturacao: [null],
        temperatura: [null],
        jejumSolidos: [8],
        jejumLiquidos: [8],
      }),

      comorbidades: this.fb.group({
        ...comorbidades,
        outros: this.fb.group({ descricao: [''] }),
        historiaFamiliar: this.fb.group({ descricao: [''] }),
      }),

      habitos: this.fb.group({
        drogasIlicitas: [null],
        drogasTipos: this.fb.group(drogasTipos),
        drogasOutrosDescricao: [''],
        tabagista: [null],
        cargaTabagica: [''],
        etilista: [null],
        gramasAlcoolDia: [''],
      }),

      alergias: this.fb.group({
        possuiAlergia: [null],
        tipos: this.fb.group(alergiaTipos),
        outrosDescricao: [''],
        tipoReacao: [''],
        antecedentesAnestesicos: [''],
      }),

      medicacoes: this.fb.group({
        usaMedicacao: [null],
        itens: this.fb.array([this.novaMedicacao()]),
      }),

      exameFisico: this.fb.group({
        ...exameGroups,
        mucosas: [[] as string[]],
        denticao: [null],
        distanciaInterIncisivos: [null],
        comprimentoIncisivosSuperiores: [null],
        mallampati: [null],
        relacaoIncisivos: [null],
        palato: [null],
        protusaoMandibula: [null],
        pescocoComprimento: [null],
        pescocoLargura: [null],
        distanciaEsternocleidomentoniana: [null],
        distanciaTireomentoniana: [null],
        flexaoPescoco: [null],
        extensaoPescoco: [null],
        complacenciaEspacoMandibular: [null],
        observacoesViaAerea: [''],
        anomaliaCaixaToracica: [null],
        anomaliaCaixaToracicaDescricao: [''],
        previsaoIotDificil: [null],
      }),

      exames: this.fb.group({
        hemoglobina: [null],
        hematocrito: [null],
        leucocitos: [null],
        plaquetas: [null],
        tapInr: [null],
        ttpa: [null],
        glicemia: [null],
        ureia: [null],
        creatinina: [null],
        sodio: [null],
        potassio: [null],
        tp: [''],
        eas: [''],
        funcaoHepatica: [''],
        testeGravidez: [''],
        provaFuncaoRespiratoria: [''],
        ecg: [''],
        rxTorax: [''],
        ecocardiograma: [''],
        outrosExames: [''],
        parecerCardiologia: [''],
        outrosPareceres: this.fb.array([] as any[]),
      }),

      conduta: this.fb.group({
        asa: [null, Validators.required],
        emergencia: [false],
        naoLiberado: [false],
        motivoNaoLiberacao: [''],
        condutas: this.fb.group(condutas),
        anotacoes: [''],
      }),
    });

    this.form.get('antropometria.peso')?.valueChanges.subscribe(() => this.recalcImc());
    this.form.get('antropometria.altura')?.valueChanges.subscribe(() => this.recalcImc());
  }

  private recalcImc(): void {
    const g = this.form.get('antropometria') as FormGroup;
    const peso = Number(g.get('peso')?.value);
    const altura = Number(g.get('altura')?.value);
    if (peso > 0 && altura > 0) {
      const m = altura / 100;
      g.get('imc')?.setValue(Number((peso / (m * m)).toFixed(2)), { emitEvent: false });
    }
  }


  get cirurgias(): FormArray {
    return this.form.get('procedimento.cirurgias') as FormArray;
  }

  cirurgiaSelecionada = '';

  addCirurgia(nome?: string): void {
    if (!this.canEdit) return;
    const valor = (nome ?? this.cirurgiaSelecionada ?? '').trim();
    if (!valor) return;
    if (this.cirurgias.value.some((c: any) => c.nome === valor)) return;
    this.cirurgias.push(this.fb.group({ nome: [valor], principal: [this.cirurgias.length === 0] }));
    this.cirurgiaSelecionada = '';
  }

  removeCirurgia(i: number): void {
    if (!this.canEdit) return;
    this.cirurgias.removeAt(i);
  }

  setCirurgiaPrincipal(i: number): void {
    if (!this.canEdit) return;
    this.cirurgias.controls.forEach((c, idx) => c.get('principal')?.setValue(idx === i));
  }

  private novaMedicacao(): FormGroup {
    return this.fb.group({ nome: [''], dose: [''], via: [''], frequencia: [''] });
  }

  get medicacoes(): FormArray {
    return this.form.get('medicacoes.itens') as FormArray;
  }

  addMedicacao(): void {
    if (!this.canEdit) return;
    this.medicacoes.push(this.novaMedicacao());
  }

  removeMedicacao(i: number): void {
    if (!this.canEdit) return;
    if (this.medicacoes.length > 1) this.medicacoes.removeAt(i);
    else this.medicacoes.at(0).reset();
  }

  get outrosPareceres(): FormArray {
    return this.form.get('exames.outrosPareceres') as FormArray;
  }

  addParecer(): void {
    if (!this.canEdit) return;
    this.outrosPareceres.push(this.fb.group({ especialidade: [''], descricao: [''] }));
  }

  removeParecer(i: number): void {
    if (!this.canEdit) return;
    this.outrosPareceres.removeAt(i);
  }

  setBool(path: string, value: boolean): void {
    if (!this.canEdit) return;
    this.form.get(path)?.setValue(value);
  }

  isBool(path: string, value: boolean): boolean {
    return this.form.get(path)?.value === value;
  }

  setValue(path: string, value: any): void {
    if (!this.canEdit) return;
    this.form.get(path)?.setValue(value);
  }

  isValue(path: string, value: any): boolean {
    return this.form.get(path)?.value === value;
  }

  toggleMulti(path: string, value: string): void {
    if (!this.canEdit) return;
    const ctrl = this.form.get(path);
    if (!ctrl) return;
    const current: string[] = Array.isArray(ctrl.value) ? [...ctrl.value] : [];
    const idx = current.indexOf(value);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(value);
    ctrl.setValue(current);
    ctrl.markAsDirty();
  }

  isMulti(path: string, value: string): boolean {
    const v = this.form.get(path)?.value;
    return Array.isArray(v) && v.includes(value);
  }

  toggleValue(path: string): void {
    if (!this.canEdit) return;
    const ctrl = this.form.get(path);
    ctrl?.setValue(!ctrl.value);
  }

  isChecked(path: string): boolean {
    return !!this.form.get(path)?.value;
  }

  hasOutros(basePath: string): boolean {
    return !!this.form.get(`${basePath}.outros`)?.value;
  }

  groupControlPath(base: string, groupKey: string, optionKey: string): string {
    return `${base}.${groupKey}.${optionKey}`;
  } 

  private loadInitialState(): void {
    if (!this.anesthesiaRecordId || !this.patientId) {
      this.formSub = this.form.valueChanges.pipe(debounceTime(400)).subscribe(() => this.onFormChanged());
      return;
    }

    this.isLoadingRecord = true;
    this.preAnesthesicService.getByAnesthesiaRecordId(this.anesthesiaRecordId).subscribe((record) => {
      this.isLoadingRecord = false;

      if (record) {
        this.remoteRecordId = record.id ?? null;
        this.isFinalized = !!(record.signedAt && record.signedAt.trim());
        this.isResponsible = !record.firstAnesthesiologistId ||
          String(record.firstAnesthesiologistId) === String(this.loggedUser?.id);
      }

      if (this.isFinalized && record) {
        // Registro já assinado: o servidor é a fonte autoritativa e a ficha vira somente leitura.
        this.patchFormFromDraft(this.extractDraft(record));
        this.preAnesthesicService.clearDraft(this.anesthesiaRecordId!, this.patientId!);
        this.form.disable();
      } else if (!this.canEdit) {        
        if (record) this.patchFormFromDraft(this.extractDraft(record));
        this.form.disable();
      } else {
        const localDraft = this.preAnesthesicService.getDraft(this.anesthesiaRecordId!, this.patientId!);
        if (localDraft) {
          this.patchFormFromDraft(localDraft);
        }
      }

      this.formSub = this.form.valueChanges.pipe(debounceTime(400)).subscribe(() => this.onFormChanged());
      this.startSyncTimer();
    });
  }

  private startSyncTimer(): void {
    if (this.syncTimerSub) return;
    this.syncTimerSub = interval(15000).subscribe(() => this.trySync());
  }

  /** Único caso a reenviar automaticamente: uma assinatura que foi tentada mas falhou ao chegar no backend. */
  private trySync(): void {
    if (!this.pendingFinalizePayload || !navigator.onLine) return;

    this.submitPayload(this.pendingFinalizePayload, {
      onSuccess: async () => {
        const t = await this.toastCtrl.create({
          message: 'Avaliação pré-anestésica assinada e salva com sucesso.',
          duration: 2200,
          color: 'success',
          position: 'top',
        });
        await t.present();
      },
    });
  }

  private submitPayload(
    payload: PreAnesthesicRecordPayload,
    opts: { onSuccess?: () => void; onError?: (err: any) => void },
  ): void {
    if (this.isSubmittingSignature) return;
    this.isSubmittingSignature = true;

    this.preAnesthesicService.submit(payload, this.remoteRecordId).subscribe({
      next: (res: any) => {
        this.isSubmittingSignature = false;
        this.remoteRecordId = res?.data?.id ?? res?.id ?? this.remoteRecordId;
        this.pendingFinalizePayload = null;
        this.isFinalized = true;
        this.form.disable();
        this.preAnesthesicService.clearDraft(this.anesthesiaRecordId!, this.patientId!);
        this.lastSavedAt = new Date();
        this.syncTimerSub?.unsubscribe();
        this.syncTimerSub = undefined;

        opts.onSuccess?.();
      },
      error: (err) => {
        this.isSubmittingSignature = false;
        this.pendingFinalizePayload = payload;
        console.warn('[pre-anestesica] falha ao enviar a assinatura, rascunho local mantido para nova tentativa', err);
        opts.onError?.(err);
      },
    });
  }

  private extractDraft(payload: PreAnesthesicRecordPayload): PreAnesthesicRecordDraft {
    const { id, patientId, anesthesiaRecordId, signedByProfessionalId, signedByName, signedAt, ...draft } = payload;
    return draft as PreAnesthesicRecordDraft;
  }

  private onFormChanged(): void {
    if (!this.anesthesiaRecordId || !this.patientId || !this.canEdit) return;
    this.preAnesthesicService.saveDraft(this.anesthesiaRecordId, this.patientId, this.toDraft());
    this.lastSavedAt = new Date();
  }

  saveDraft(): void {
    if (!this.anesthesiaRecordId || !this.patientId || !this.canEdit) return;
    this.preAnesthesicService.saveDraft(this.anesthesiaRecordId, this.patientId, this.toDraft());
    this.lastSavedAt = new Date();
  }

  private selectedKeys(def: ChecklistGroupDef, value: any): string[] {
    return def.options.filter((o) => !!value?.[o.key]).map((o) => o.key);
  }
  
  toDraft(): PreAnesthesicRecordDraft {
    const raw = this.form.getRawValue();

    const comorbidities: Record<string, PreAnesthesicChecklistFinding> = {};
    this.comorbidadeGroups.forEach((g) => {
      comorbidities[g.key] = {
        findings: this.selectedKeys(g, raw.comorbidades[g.key]),
        otherDescription: raw.comorbidades[g.key]?.outrosDescricao ?? '',
        observations: raw.comorbidades[g.key]?.observacoes ?? '',
      };
    });

    const physicalExamAreas: Record<string, PreAnesthesicChecklistFinding> = {};
    this.exameFisicoGroups.forEach((g) => {
      physicalExamAreas[g.key] = {
        findings: this.selectedKeys(g, raw.exameFisico[g.key]),
        otherDescription: raw.exameFisico[g.key]?.outrosDescricao ?? '',
        observations: raw.exameFisico[g.key]?.observacoes ?? '',
      };
    });

    const cardiologyDescricao = (raw.exames.parecerCardiologia ?? '').trim();
    const outrosPareceres = (raw.exames.outrosPareceres ?? [])
      .filter((p: any) => (p?.descricao ?? '').trim())
      .map((p: any) => ({ specialty: p.especialidade ?? '', description: p.descricao }));

    return {
      procedure: {
        surgeries: (raw.procedimento.cirurgias ?? []).map((c: any) => ({ name: c.nome ?? '', isPrimary: !!c.principal })),
        laterality: raw.procedimento.lateralidade || null,
        preOperativeDiagnosis: raw.procedimento.diagnosticoPreOperatorio ?? '',
        consultationDate: raw.procedimento.dataConsulta ?? '',
        observation: raw.procedimento.observacao ?? '',
      },
      anthropometry: {
        weightKg: raw.antropometria.peso,
        heightCm: raw.antropometria.altura,
        bmi: raw.antropometria.imc,
        heartRate: raw.antropometria.frequenciaCardiaca,
        systolicBloodPressure: raw.antropometria.pressaoSistolica,
        diastolicBloodPressure: raw.antropometria.pressaoDiastolica,
        spo2: raw.antropometria.saturacao,
        temperature: raw.antropometria.temperatura,
        fastingSolidsHours: raw.antropometria.jejumSolidos,
        fastingLiquidsHours: raw.antropometria.jejumLiquidos,
      },
      comorbidities,
      comorbiditiesOtherDescription: raw.comorbidades.outros?.descricao ?? '',
      familyHistory: raw.comorbidades.historiaFamiliar?.descricao ?? '',
      habits: {
        illicitDrugUse: raw.habitos.drogasIlicitas,
        drugTypes: this.drogasOptions.filter((o) => raw.habitos.drogasTipos?.[o.key]).map((o) => o.key),
        drugsOtherDescription: raw.habitos.drogasOutrosDescricao ?? '',
        smoker: raw.habitos.tabagista,
        smokingLoad: raw.habitos.cargaTabagica ?? '',
        alcoholUse: raw.habitos.etilista,
        alcoholGramsPerDay: raw.habitos.gramasAlcoolDia ?? '',
      },
      allergies: {
        hasAllergy: raw.alergias.possuiAlergia,
        substances: this.alergiaOptions.filter((o) => raw.alergias.tipos?.[o.key]).map((o) => o.key),
        otherDescription: raw.alergias.outrosDescricao ?? '',
        reactionType: raw.alergias.tipoReacao ?? '',
        anestheticHistory: raw.alergias.antecedentesAnestesicos ?? '',
      },
      medicationsInUse: {
        usesMedication: raw.medicacoes.usaMedicacao,
        items: (raw.medicacoes.itens ?? [])
          .filter((m: any) => (m?.nome ?? '').trim())
          .map((m: any) => ({ name: m.nome ?? '', dose: m.dose ?? '', route: m.via ?? '', frequency: m.frequencia ?? '' })),
      },
      physicalExam: {
        areas: physicalExamAreas,
        airway: {
          mucosa: raw.exameFisico.mucosas ?? [],
          dentition: raw.exameFisico.denticao ?? null,
          interIncisorDistance: raw.exameFisico.distanciaInterIncisivos ?? null,
          upperIncisorLength: raw.exameFisico.comprimentoIncisivosSuperiores ?? null,
          mallampatiClass: raw.exameFisico.mallampati ?? null,
          incisorRelation: raw.exameFisico.relacaoIncisivos ?? null,
          palate: raw.exameFisico.palato ?? null,
          mandibleProtrusion: raw.exameFisico.protusaoMandibula ?? null,
          neckLength: raw.exameFisico.pescocoComprimento ?? null,
          neckWidth: raw.exameFisico.pescocoLargura ?? null,
          sternomentalDistance: raw.exameFisico.distanciaEsternocleidomentoniana ?? null,
          thyromentalDistance: raw.exameFisico.distanciaTireomentoniana ?? null,
          neckFlexion: raw.exameFisico.flexaoPescoco ?? null,
          neckExtension: raw.exameFisico.extensaoPescoco ?? null,
          mandibularSpaceCompliance: raw.exameFisico.complacenciaEspacoMandibular ?? null,
          observations: raw.exameFisico.observacoesViaAerea ?? '',
        },
        thoracicCageAbnormality: raw.exameFisico.anomaliaCaixaToracica,
        thoracicCageAbnormalityDescription: raw.exameFisico.anomaliaCaixaToracicaDescricao ?? '',
        difficultIntubationPrediction: raw.exameFisico.previsaoIotDificil,
      },
      labs: {
        hemoglobin: raw.exames.hemoglobina,
        hematocrit: raw.exames.hematocrito,
        leukocytes: raw.exames.leucocitos,
        platelets: raw.exames.plaquetas,
        tapInr: raw.exames.tapInr,
        aptt: raw.exames.ttpa,
        glucose: raw.exames.glicemia,
        urea: raw.exames.ureia,
        creatinine: raw.exames.creatinina,
        sodium: raw.exames.sodio,
        potassium: raw.exames.potassio,
        tp: raw.exames.tp ?? '',
        urinalysis: raw.exames.eas ?? '',
        liverFunctionTests: raw.exames.funcaoHepatica ?? '',
        pregnancyTest: raw.exames.testeGravidez ?? '',
      },
      imaging: {
        ecg: raw.exames.ecg ?? '',
        chestXRay: raw.exames.rxTorax ?? '',
        echocardiogram: raw.exames.ecocardiograma ?? '',
        pulmonaryFunctionTest: raw.exames.provaFuncaoRespiratoria ?? '',
        other: raw.exames.outrosExames ?? '',
      },
      reports: [
        ...(cardiologyDescricao ? [{ specialty: 'CARDIOLOGIST', description: cardiologyDescricao }] : []),
        ...outrosPareceres,
      ],
      conduct: {
        asaClassification: raw.conduta.asa ?? null,
        isEmergency: !!raw.conduta.emergencia,
        notCleared: !!raw.conduta.naoLiberado,
        notClearedReason: raw.conduta.motivoNaoLiberacao ?? '',
        actions: this.condutaOptions.filter((o) => raw.conduta.condutas?.[o.key]).map((o) => o.key),
        notes: raw.conduta.anotacoes ?? '',
      },
    };
  }

  /** Reconstrói o formulário (PT-BR) a partir de um rascunho/payload em inglês. */
  private patchFormFromDraft(draft: PreAnesthesicRecordDraft): void {
    this.cirurgias.clear();
    (draft.procedure?.surgeries ?? []).forEach((s) =>
      this.cirurgias.push(this.fb.group({ nome: [s.name ?? ''], principal: [!!s.isPrimary] })),
    );

    const meds = draft.medicationsInUse?.items ?? [];
    this.medicacoes.clear();
    if (meds.length) {
      meds.forEach((m) =>
        this.medicacoes.push(
          this.fb.group({
            nome: [m.name ?? ''],
            dose: [m.dose ?? ''],
            via: [m.route ?? ''],
            frequencia: [m.frequency ?? ''],
          }),
        ),
      );
    } else {
      this.medicacoes.push(this.novaMedicacao());
    }

    const reports = draft.reports ?? [];
    const cardiologyReport = reports.find((r) => r.specialty === 'CARDIOLOGIST');
    const otherReports = reports.filter((r) => r.specialty !== 'CARDIOLOGIST');
    this.outrosPareceres.clear();
    otherReports.forEach((r) =>
      this.outrosPareceres.push(this.fb.group({ especialidade: [r.specialty ?? ''], descricao: [r.description ?? ''] })),
    );

    const comorbidadesPatch: any = {};
    this.comorbidadeGroups.forEach((g) => {
      const finding = draft.comorbidities?.[g.key];
      const flags: Record<string, boolean> = {};
      g.options.forEach((o) => (flags[o.key] = !!finding?.findings?.includes(o.key)));
      comorbidadesPatch[g.key] = {
        ...flags,
        outrosDescricao: finding?.otherDescription ?? '',
        observacoes: finding?.observations ?? '',
      };
    });

    const exameFisicoPatch: any = {};
    this.exameFisicoGroups.forEach((g) => {
      const finding = draft.physicalExam?.areas?.[g.key];
      const flags: Record<string, boolean> = {};
      g.options.forEach((o) => (flags[o.key] = !!finding?.findings?.includes(o.key)));
      exameFisicoPatch[g.key] = {
        ...flags,
        outrosDescricao: finding?.otherDescription ?? '',
        observacoes: finding?.observations ?? '',
      };
    });

    const drogasTiposPatch: Record<string, boolean> = {};
    this.drogasOptions.forEach((o) => (drogasTiposPatch[o.key] = !!draft.habits?.drugTypes?.includes(o.key)));

    const alergiaTiposPatch: Record<string, boolean> = {};
    this.alergiaOptions.forEach((o) => (alergiaTiposPatch[o.key] = !!draft.allergies?.substances?.includes(o.key)));

    const condutasPatch: Record<string, boolean> = {};
    this.condutaOptions.forEach((o) => (condutasPatch[o.key] = !!draft.conduct?.actions?.includes(o.key)));

    this.form.patchValue({
      procedimento: {
        lateralidade: draft.procedure?.laterality ?? '',
        diagnosticoPreOperatorio: draft.procedure?.preOperativeDiagnosis ?? '',
        dataConsulta: draft.procedure?.consultationDate || new Date().toISOString().slice(0, 16),
        observacao: draft.procedure?.observation ?? '',
      },
      antropometria: {
        peso: draft.anthropometry?.weightKg ?? null,
        altura: draft.anthropometry?.heightCm ?? null,
        imc: draft.anthropometry?.bmi ?? null,
        frequenciaCardiaca: draft.anthropometry?.heartRate ?? null,
        pressaoSistolica: draft.anthropometry?.systolicBloodPressure ?? null,
        pressaoDiastolica: draft.anthropometry?.diastolicBloodPressure ?? null,
        saturacao: draft.anthropometry?.spo2 ?? null,
        temperatura: draft.anthropometry?.temperature ?? null,
        jejumSolidos: draft.anthropometry?.fastingSolidsHours ?? 8,
        jejumLiquidos: draft.anthropometry?.fastingLiquidsHours ?? 8,
      },
      comorbidades: {
        ...comorbidadesPatch,
        outros: { descricao: draft.comorbiditiesOtherDescription ?? '' },
        historiaFamiliar: { descricao: draft.familyHistory ?? '' },
      },
      habitos: {
        drogasIlicitas: draft.habits?.illicitDrugUse ?? null,
        drogasTipos: drogasTiposPatch,
        drogasOutrosDescricao: draft.habits?.drugsOtherDescription ?? '',
        tabagista: draft.habits?.smoker ?? null,
        cargaTabagica: draft.habits?.smokingLoad ?? '',
        etilista: draft.habits?.alcoholUse ?? null,
        gramasAlcoolDia: draft.habits?.alcoholGramsPerDay ?? '',
      },
      alergias: {
        possuiAlergia: draft.allergies?.hasAllergy ?? null,
        tipos: alergiaTiposPatch,
        outrosDescricao: draft.allergies?.otherDescription ?? '',
        tipoReacao: draft.allergies?.reactionType ?? '',
        antecedentesAnestesicos: draft.allergies?.anestheticHistory ?? '',
      },
      medicacoes: {
        usaMedicacao: draft.medicationsInUse?.usesMedication ?? null,
      },
      exameFisico: {
        ...exameFisicoPatch,
        mucosas: draft.physicalExam?.airway?.mucosa ?? [],
        denticao: draft.physicalExam?.airway?.dentition ?? null,
        distanciaInterIncisivos: draft.physicalExam?.airway?.interIncisorDistance ?? null,
        comprimentoIncisivosSuperiores: draft.physicalExam?.airway?.upperIncisorLength ?? null,
        mallampati: draft.physicalExam?.airway?.mallampatiClass ?? null,
        relacaoIncisivos: draft.physicalExam?.airway?.incisorRelation ?? null,
        palato: draft.physicalExam?.airway?.palate ?? null,
        protusaoMandibula: draft.physicalExam?.airway?.mandibleProtrusion ?? null,
        pescocoComprimento: draft.physicalExam?.airway?.neckLength ?? null,
        pescocoLargura: draft.physicalExam?.airway?.neckWidth ?? null,
        distanciaEsternocleidomentoniana: draft.physicalExam?.airway?.sternomentalDistance ?? null,
        distanciaTireomentoniana: draft.physicalExam?.airway?.thyromentalDistance ?? null,
        flexaoPescoco: draft.physicalExam?.airway?.neckFlexion ?? null,
        extensaoPescoco: draft.physicalExam?.airway?.neckExtension ?? null,
        complacenciaEspacoMandibular: draft.physicalExam?.airway?.mandibularSpaceCompliance ?? null,
        observacoesViaAerea: draft.physicalExam?.airway?.observations ?? '',
        anomaliaCaixaToracica: draft.physicalExam?.thoracicCageAbnormality ?? null,
        anomaliaCaixaToracicaDescricao: draft.physicalExam?.thoracicCageAbnormalityDescription ?? '',
        previsaoIotDificil: draft.physicalExam?.difficultIntubationPrediction ?? null,
      },
      exames: {
        hemoglobina: draft.labs?.hemoglobin ?? null,
        hematocrito: draft.labs?.hematocrit ?? null,
        leucocitos: draft.labs?.leukocytes ?? null,
        plaquetas: draft.labs?.platelets ?? null,
        tapInr: draft.labs?.tapInr ?? null,
        ttpa: draft.labs?.aptt ?? null,
        glicemia: draft.labs?.glucose ?? null,
        ureia: draft.labs?.urea ?? null,
        creatinina: draft.labs?.creatinine ?? null,
        sodio: draft.labs?.sodium ?? null,
        potassio: draft.labs?.potassium ?? null,
        tp: draft.labs?.tp ?? '',
        eas: draft.labs?.urinalysis ?? '',
        funcaoHepatica: draft.labs?.liverFunctionTests ?? '',
        testeGravidez: draft.labs?.pregnancyTest ?? '',
        ecg: draft.imaging?.ecg ?? '',
        rxTorax: draft.imaging?.chestXRay ?? '',
        ecocardiograma: draft.imaging?.echocardiogram ?? '',
        provaFuncaoRespiratoria: draft.imaging?.pulmonaryFunctionTest ?? '',
        outrosExames: draft.imaging?.other ?? '',
        parecerCardiologia: cardiologyReport?.description ?? '',
      },
      conduta: {
        asa: draft.conduct?.asaClassification ?? null,
        emergencia: !!draft.conduct?.isEmergency,
        naoLiberado: !!draft.conduct?.notCleared,
        motivoNaoLiberacao: draft.conduct?.notClearedReason ?? '',
        condutas: condutasPatch,
        anotacoes: draft.conduct?.notes ?? '',
      },
    });
  }

  private isScrolling = false;
  private scrollTimeout: any;

  private onScroll = () => {
    if (this.isScrolling) return;
    const scrollContainer = document.querySelector('.pre-scroll') as HTMLElement | null;
    if (!scrollContainer) return;
    const top = scrollContainer.scrollTop + 120;
    for (const s of this.sections) {
      const el = document.getElementById(`sec-${s.id}`);
      if (el && el.offsetTop <= top) this.activeSectionId = s.id;
    }
  };

  private setupScrollSpy(): void {
    setTimeout(() => {
      const scrollContainer = document.querySelector('.pre-scroll');
      scrollContainer?.addEventListener('scroll', this.onScroll, { passive: true });
    }, 300);
  }

  goToSection(id: string): void {
    this.activeSectionId = id;
    const el = document.getElementById(`sec-${id}`);
    if (el) {
      this.isScrolling = true;
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
      }, 800);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  goBack(): void {
    this.location.back();
  }

  get expectedSignatureName(): string {
    return (this.loggedUser?.name || this.loggedUser?.fullName || '').trim();
  }

  get headerActionButtons(): HeaderActionButton[] {
    if (this.isFinalized || !this.canEdit) {
      return [
        {
          id: 'go-to-anesthesia-record',
          icon: 'reader-outline',
          color: 'warning',
          ariaLabel: 'Ir para Ficha Anestésica',
          label: 'Ficha Anest.',
          action: () => this.irParaFichaAnestesica(),
        },
      ];
    }
    return [
      { id: 'save-draft', icon: 'save-outline', color: 'muted', ariaLabel: 'Salvar rascunho', label: 'Salvar Rasc.', action: () => this.saveDraft() },
      { id: 'finalize', icon: 'shield-checkmark-outline', color: 'primary', ariaLabel: 'Finalizar avaliação', label: 'Concluir', action: () => this.salvar() },
    ];
  }


  async salvar(): Promise<void> {
    this.saveDraft();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const t = await this.toastCtrl.create({
        message: 'Preencha os campos obrigatórios (Classificação ASA).',
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
      await t.present();
      return;
    }
    this.openSignModal();
  }

  openSignModal(): void {
    this.signatureAgreed = false;
    this.signaturePassword = '';
    this.signatureError = '';
    this.isSignModalOpen = true;
  }

  closeSignModal(): void {
    this.isSignModalOpen = false;
  }

  onSignatureAgreedChange(checked: boolean): void {
    this.signatureAgreed = checked;
    // ion-modal renderiza o conteúdo com OnPush; forçamos a checagem para refletir
    // o estado imediatamente, sem depender de outro evento para disparar o CD.
    this.cdr.detectChanges();
  }

  confirmarESalvar(): void {
    this.signatureError = '';

    if (!this.signatureAgreed) {
      this.signatureError = 'Você precisa marcar a confirmação de veracidade dos dados.';
      return;
    }

    const senha = (this.signaturePassword || '').trim();
    if (!senha) {
      this.signatureError = 'Informe sua senha para assinar digitalmente.';
      return;
    }

    this.isSignModalOpen = false;
    this.executarSalvamento();
  }

  private buildFinalPayload(): PreAnesthesicRecordPayload {
    return {
      ...this.toDraft(),
      anesthesiaRecordId: this.anesthesiaRecordId,
      patientId: this.patientId,
      signedByProfessionalId: this.loggedUser?.id ?? null,
      signedByName: this.expectedSignatureName,
      signedAt: new Date().toISOString(),
    };
  }

  private executarSalvamento(): void {
    if (!this.anesthesiaRecordId || !this.patientId) return;

    this.isSaving = true;
    const payload = this.buildFinalPayload();

    this.submitPayload(payload, {
      onSuccess: async () => {
        this.isSaving = false;
        this.signaturePassword = '';

        const t = await this.toastCtrl.create({
          message: 'Avaliação pré-anestésica assinada e salva com sucesso.',
          duration: 2200,
          color: 'success',
          position: 'top',
        });
        await t.present();
      },
      onError: async () => {
        this.isSaving = false;

        const t = await this.toastCtrl.create({
          message: 'Não foi possível enviar a avaliação pré-anestésica para o servidor. O rascunho foi mantido e o envio será refeito automaticamente assim que possível.',
          duration: 3500,
          color: 'danger',
          position: 'top',
        });
        await t.present();
      },
    });
  }
  irParaFichaAnestesica(): void {
    if (this.anesthesiaRecordId && this.patientId) {
      this.router.navigate(['/ficha-anestesica', this.anesthesiaRecordId, this.patientId]);
    }
  }
}
