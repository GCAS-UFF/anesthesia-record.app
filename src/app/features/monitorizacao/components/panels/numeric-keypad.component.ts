import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Teclado numérico próprio dos painéis da Monitorização: evita o teclado do
 * sistema cobrindo o painel e mantém as teclas grandes e sempre no mesmo lugar.
 * Trabalha com o texto do campo ativo (vírgula como separador decimal).
 */
@Component({
  selector: 'app-numeric-keypad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kp" role="group" aria-label="Teclado numérico">
      <button type="button" *ngFor="let k of keys" class="kp__key" [class.kp__key--fn]="k === '⌫' || k === '±'"
        [disabled]="disabled || (k === ',' && !allowDecimal) || (k === '±' && !allowNegative)"
        [attr.aria-label]="k === '⌫' ? 'Apagar' : k === '±' ? 'Inverter sinal' : k"
        (click)="press(k)">{{ k }}</button>
    </div>
  `,
  styles: [`
    .kp { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .kp__key {
      height: 52px; border: none; border-radius: 12px; background: #dce7ec; color: #223740;
      font-family: 'Manrope', system-ui, sans-serif; font-size: 22px; font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .kp__key:active:not(:disabled) { background: #c6e4ed; }
    .kp__key--fn { background: #e9eff2; font-size: 20px; }
    .kp__key:disabled { opacity: 0.35; }
  `],
})
export class NumericKeypadComponent {
  @Input() value = '';
  @Input() allowDecimal = true;
  @Input() allowNegative = false;
  @Input() disabled = false;
  @Input() maxLength = 6;
  @Output() valueChange = new EventEmitter<string>();

  get keys(): string[] {
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', this.allowNegative ? '±' : ',', '0', '⌫'];
  }

  press(key: string): void {
    let v = this.value ?? '';
    if (key === '⌫') {
      v = v.slice(0, -1);
    } else if (key === '±') {
      v = v.startsWith('-') ? v.slice(1) : `-${v}`;
    } else if (key === ',') {
      if (v.includes(',')) return;
      v = (v === '' || v === '-' ? `${v}0` : v) + ',';
    } else {
      if (v.replace('-', '').length >= this.maxLength) return;
      v = v === '0' ? key : v + key;
    }
    this.valueChange.emit(v);
  }
}

/** Converte o texto do teclado ("36,5") em número; vazio ou inválido → null. */
export function keypadToNumber(text: string | null | undefined): number | null {
  if (text == null) return null;
  const t = String(text).trim();
  if (!t || t === '-' || t.endsWith(',')) {
    const n = Number(t.replace(',', '.').replace(/[.,]$/, ''));
    return t && t !== '-' && Number.isFinite(n) ? n : null;
  }
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function numberToKeypad(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) ? '' : String(n).replace('.', ',');
}
