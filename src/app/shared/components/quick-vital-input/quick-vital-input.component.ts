import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { TranslatePipe } from '@ngx-translate/core';

type CustomVitalField = {
  key: string;
  label: string;
  unit?: string;
};

@Component({
  selector: 'app-quick-vital-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    TranslatePipe,
  ],
  templateUrl: './quick-vital-input.component.html',
  styleUrls: ['./quick-vital-input.component.scss'],
})
export class QuickVitalInputComponent implements OnInit {
  @Input() customFields: CustomVitalField[] = [];
  @Input() isAuto = false;
  @Input() initialValue: any = null;

  form: any = {
    pas: null, pad: null, pam: null,
    fc: null, spo2: null, etco2: null,
    bis: null, pvc: null, pcap: null, temp: null,
    time: null as string | null,
    custom: {} as Record<string, number | null>,
  };

  touched = false;

  get isEdit(): boolean {
    return !!this.initialValue;
  }

  readonly vitalFields = [
    { key: 'pas', label: 'sharedComponents.quickVitalInput.fields.pas', unit: 'mmHg', min: 40, max: 260 },
    { key: 'pad', label: 'sharedComponents.quickVitalInput.fields.pad', unit: 'mmHg', min: 20, max: 180 },
    { key: 'pam', label: 'sharedComponents.quickVitalInput.fields.pam', unit: 'mmHg', min: 20, max: 220 },
    { key: 'fc', label: 'sharedComponents.quickVitalInput.fields.fc', unit: 'bpm', min: 20, max: 240 },
    { key: 'spo2', label: 'sharedComponents.quickVitalInput.fields.spo2', unit: '%', min: 0, max: 100 },
    { key: 'etco2', label: 'sharedComponents.quickVitalInput.fields.etco2', unit: 'mmHg', min: 0, max: 100 },
    { key: 'bis', label: 'sharedComponents.quickVitalInput.fields.bis', unit: '', min: 0, max: 100 },
    { key: 'pvc', label: 'sharedComponents.quickVitalInput.fields.pvc', unit: 'cmH₂O', min: -10, max: 50 },
    { key: 'pcap', label: 'sharedComponents.quickVitalInput.fields.pcap', unit: 'mmHg', min: 0, max: 60 },
    { key: 'temp', label: 'sharedComponents.quickVitalInput.fields.temp', unit: '°C', min: 25, max: 45, step: '0.1' },
  ];

  constructor(private modalController: ModalController) {
    addIcons({ closeOutline });
  }

  ngOnInit(): void {
    if (this.initialValue) {
      const initCustom: Record<string, any> = { ...(this.initialValue.custom ?? {}) };

      for (const f of this.customFields || []) {
        if (initCustom[f.key] == null && this.initialValue[f.key] != null) {
          initCustom[f.key] = this.initialValue[f.key];
        }
      }
      this.form = {
        ...this.form,
        ...this.initialValue,
        temp: this.initialValue.temp ?? this.initialValue.temperatura ?? null,
        time: this.initialValue.time ?? null,
        custom: initCustom,
      };
    } else {    
      const now = new Date();
      this.form.time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  }

  setValue(key: string, value: unknown): void {
    this.form[key] = this.toNumber(value);
    if (key === 'pas' || key === 'pad') this.recalculatePam();
  }

  setTime(value: string): void {
    this.form.time = value || null;
  }

  setCustomValue(key: string, value: unknown): void {
    this.form.custom = {
      ...(this.form.custom ?? {}),
      [key]: this.toNumber(value),
    };
  }

  hasAnyRequiredSignal(): boolean {
    const std = ['pas', 'pad', 'pam', 'fc', 'spo2', 'etco2', 'bis', 'pvc', 'pcap', 'temp']
      .some((k) => this.form[k] !== null && this.form[k] !== undefined && this.form[k] !== '');
    if (std) return true;
   
    const custom = Object.values(this.form.custom ?? {})
      .some((v) => v !== null && v !== undefined && v !== '');
    return custom;
  }

  async cancel(): Promise<void> {
    await this.modalController.dismiss(null, 'cancel');
  }

  async save(): Promise<void> {
    this.touched = true;
    if (!this.hasAnyRequiredSignal()) return;

    const payload: any = {};
    ['pas', 'pad', 'pam', 'fc', 'spo2', 'etco2', 'bis', 'pvc', 'pcap', 'temp'].forEach((k) => {
      const v = this.form[k];
      if (v !== null && v !== undefined && v !== '') payload[k] = v;
    });

    
    const custom: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.form.custom ?? {})) {
      if (v !== null && v !== undefined && (v as any) !== '') {
        custom[k] = v as number;
        if (!(k in payload)) 
          payload[k] = v;
      }
    }
    if (Object.keys(custom).length > 0)
      payload.custom = custom;

    if (this.form.time) {
      payload.time = this.form.time;
    }

    await this.modalController.dismiss(payload, 'confirm');
  }

  private recalculatePam(): void {
    const pas = Number(this.form.pas);
    const pad = Number(this.form.pad);
    if (Number.isFinite(pas) && Number.isFinite(pad) && pas > 0 && pad > 0) {
      this.form.pam = Math.round((pas + 2 * pad) / 3);
    }
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
}
