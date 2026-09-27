import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { VitalRecord } from '../../models/monitoring-view.model';
import { keypadToNumber, NumericKeypadComponent, numberToKeypad } from './numeric-keypad.component';

interface FieldDef {
  key: string;
  labelKey?: string;
  label?: string;
  unit: string;
  min?: number;
  max?: number;
  decimal?: boolean;
  custom?: boolean;
}

/** Faixas do antigo formulário de lançamento; EtCO₂ até 150 como na antiga edição por célula (nenhum valor aceito antes passa a ser recusado). */
const VITAL_FIELDS: FieldDef[] = [
  { key: 'pas', labelKey: 'sharedComponents.quickVitalInput.fields.pas', unit: 'mmHg', min: 40, max: 260 },
  { key: 'pad', labelKey: 'sharedComponents.quickVitalInput.fields.pad', unit: 'mmHg', min: 20, max: 180 },
  { key: 'pam', labelKey: 'sharedComponents.quickVitalInput.fields.pam', unit: 'mmHg', min: 20, max: 220 },
  { key: 'fc', labelKey: 'sharedComponents.quickVitalInput.fields.fc', unit: 'bpm', min: 20, max: 240 },
  { key: 'spo2', labelKey: 'sharedComponents.quickVitalInput.fields.spo2', unit: '%', min: 0, max: 100 },
  { key: 'etco2', labelKey: 'sharedComponents.quickVitalInput.fields.etco2', unit: 'mmHg', min: 0, max: 150 },
  { key: 'temp', labelKey: 'sharedComponents.quickVitalInput.fields.temp', unit: '°C', min: 25, max: 45, decimal: true },
  { key: 'bis', labelKey: 'sharedComponents.quickVitalInput.fields.bis', unit: '', min: 0, max: 100 },
  { key: 'pvc', labelKey: 'sharedComponents.quickVitalInput.fields.pvc', unit: 'cmH₂O', min: -10, max: 50 },
  { key: 'pcap', labelKey: 'sharedComponents.quickVitalInput.fields.pcap', unit: 'mmHg', min: 0, max: 60 },
];

export const VITAL_KEYS = VITAL_FIELDS.map((f) => f.key);

/**
 * Registro de sinais vitais (novo ou edição de uma coluna) com teclado numérico
 * próprio. Devolve o mesmo contrato do antigo QuickVitalInput:
 * `dismiss({ pas, pad, ..., custom, time }, 'confirm')`, `'delete'` ou `'cancel'`.
 */
@Component({
  selector: 'app-vital-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, NumericKeypadComponent],
  templateUrl: './vital-panel.component.html',
  styleUrls: ['./vital-panel.component.scss'],
})
export class VitalPanelComponent implements OnInit {
  @Input() customFields: { key: string; label: string; unit?: string }[] = [];
  @Input() initialValue: VitalRecord | null = null;
  @Input() isAuto = false;
  /** Campo tocado na linha do tempo — já abre com ele ativo. */
  @Input() initialField: string | null = null;

  fields: FieldDef[] = [];
  values: Record<string, string> = {};
  active = 'pas';
  time = '';
  touched = false;
  /** PAM calculada de PAS/PAD até o usuário digitar a PAM à mão. */
  private pamManual = false;

  constructor(private readonly modalController: ModalController) {}

  get isEdit(): boolean {
    return !!this.initialValue;
  }

  ngOnInit(): void {
    this.fields = [
      ...VITAL_FIELDS,
      ...this.customFields.map((f) => ({ key: f.key, label: f.label, unit: f.unit || '', decimal: true, custom: true })),
    ];
    const init = this.initialValue;
    for (const f of this.fields) {
      const raw = f.custom ? init?.custom?.[f.key] : (init as any)?.[f.key];
      this.values[f.key] = numberToKeypad(raw ?? null);
    }
    this.pamManual = !!init?.pam && init.pam !== this.computedPam();
    this.time = init?.time ?? this.nowHM();
    if (this.initialField && this.fields.some((f) => f.key === this.initialField)) this.active = this.initialField;
  }

  get activeField(): FieldDef {
    return this.fields.find((f) => f.key === this.active) ?? this.fields[0];
  }

  select(key: string): void {
    this.active = key;
  }

  onKeypad(value: string): void {
    this.values[this.active] = value;
    if (this.active === 'pam') this.pamManual = value !== '';
    if ((this.active === 'pas' || this.active === 'pad') && !this.pamManual) {
      const pam = this.computedPam();
      this.values['pam'] = pam == null ? this.values['pam'] : String(pam);
    }
  }

  private computedPam(): number | null {
    const pas = keypadToNumber(this.values['pas']);
    const pad = keypadToNumber(this.values['pad']);
    return pas && pad ? Math.round((pas + 2 * pad) / 3) : null;
  }

  isInvalid(f: FieldDef): boolean {
    const n = keypadToNumber(this.values[f.key]);
    if (n == null) return (this.values[f.key] ?? '') !== '' && this.values[f.key] !== '-';
    return (f.min != null && n < f.min) || (f.max != null && n > f.max);
  }

  get hasAnyValue(): boolean {
    return this.fields.some((f) => keypadToNumber(this.values[f.key]) != null);
  }

  get canSave(): boolean {
    return this.hasAnyValue && !this.fields.some((f) => this.isInvalid(f));
  }

  save(): void {
    this.touched = true;
    if (!this.canSave) return;
    const payload: any = { time: this.time || this.nowHM() };
    const custom: Record<string, number> = {};
    for (const f of this.fields) {
      const n = keypadToNumber(this.values[f.key]);
      if (n == null) continue;
      if (f.custom) custom[f.key] = n;
      else payload[f.key] = n;
    }
    if (Object.keys(custom).length) payload.custom = custom;
    void this.modalController.dismiss(payload, 'confirm');
  }

  remove(): void {
    void this.modalController.dismiss(null, 'delete');
  }

  cancel(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  setNow(): void {
    this.time = this.nowHM();
  }

  private nowHM(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
