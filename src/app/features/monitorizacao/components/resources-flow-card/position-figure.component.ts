import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Bonequinho de linha (mesmo espírito de ícone de posicionamento cirúrgico
 * usado por referências do mercado) desenhado por posição — substitui o
 * emoji 🧍 rotacionado, que não representava a postura de forma reconhecível.
 * Cada posição tem sua própria pose; "Lateral Esquerda" reaproveita o desenho
 * de "Lateral Direita" espelhado (mesma anatomia, direção oposta).
 */
@Component({
  selector: 'app-position-figure',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg viewBox="0 0 28 20" [class]="'pf ' + pose" fill="none" stroke="currentColor"
         stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <g [attr.transform]="mirror ? 'scale(-1,1) translate(-28,0)' : null">
        <ng-container [ngSwitch]="pose">
          <g *ngSwitchCase="'supina'">
            <circle cx="5" cy="10" r="2" fill="currentColor" stroke="none" />
            <path d="M7,10 L18,10 M9,10 L13,6 M9,10 L13,14 M18,10 L24,7 M18,10 L24,13" />
          </g>
          <g *ngSwitchCase="'prona'">
            <circle cx="5" cy="10" r="2" fill="currentColor" stroke="none" />
            <path d="M7,10 L18,10 M9,10 L6,5 M9,10 L12,6 M18,10 L23,10 M23,10 L26,8 M23,10 L26,12" />
          </g>
          <g *ngSwitchCase="'lateral'">
            <circle cx="5" cy="9" r="2" fill="currentColor" stroke="none" />
            <path d="M7,9 Q12,11 16,11 M9,9 L11,13 M16,11 L20,9 L24,11" />
          </g>
          <g *ngSwitchCase="'litotomia'">
            <circle cx="5" cy="10" r="2" fill="currentColor" stroke="none" />
            <path d="M7,10 L16,10 M9,10 L7,13 M16,10 L19,5 L23,7 M16,10 L20,5 L24,8" />
          </g>
          <g *ngSwitchCase="'trendelenburg'">
            <g transform="rotate(-14 14 10)">
              <circle cx="5" cy="10" r="2" fill="currentColor" stroke="none" />
              <path d="M7,10 L18,10 M9,10 L13,6 M9,10 L13,14 M18,10 L24,7 M18,10 L24,13" />
            </g>
          </g>
          <g *ngSwitchCase="'trendelenburgReverso'">
            <g transform="rotate(14 14 10)">
              <circle cx="5" cy="10" r="2" fill="currentColor" stroke="none" />
              <path d="M7,10 L18,10 M9,10 L13,6 M9,10 L13,14 M18,10 L24,7 M18,10 L24,13" />
            </g>
          </g>
          <g *ngSwitchCase="'sentada'">
            <circle cx="14" cy="4" r="2" fill="currentColor" stroke="none" />
            <path d="M14,6 L14,12 M14,8 L11,11 M14,12 L20,12 L20,18" />
          </g>
          <g *ngSwitchCase="'canivete'">
            <circle cx="7" cy="8" r="2" fill="currentColor" stroke="none" />
            <path d="M14,14 L8,9 M14,14 L21,9" />
          </g>
          <g *ngSwitchCase="'fowler'">
            <circle cx="7" cy="6" r="2" fill="currentColor" stroke="none" />
            <path d="M9,7 L16,11 M11,8 L9,11 M16,11 L24,11" />
          </g>
          <g *ngSwitchDefault>
            <circle cx="14" cy="7" r="2" fill="currentColor" stroke="none" />
            <path d="M14,9 L14,15 M14,10 L10,13 M14,10 L18,13 M14,15 L11,19 M14,15 L17,19" />
          </g>
        </ng-container>
      </g>
    </svg>
  `,
  styles: [`
    .pf { width: 30px; height: 22px; display: block; }
  `],
})
export class PositionFigureComponent {
  @Input() set position(value: string) {
    const key = (value || '').toLowerCase().trim();
    this.mirror = key === 'lateral esquerda';
    this.pose = POSE_BY_POSITION[key] ?? 'default';
  }

  pose = 'default';
  mirror = false;
}

const POSE_BY_POSITION: Record<string, string> = {
  'supina': 'supina',
  'prona': 'prona',
  'lateral direita': 'lateral',
  'lateral esquerda': 'lateral',
  'litotomia': 'litotomia',
  'trendelenburg': 'trendelenburg',
  'trendelenburg reverso': 'trendelenburgReverso',
  'sentada': 'sentada',
  'canivete': 'canivete',
  'fowler': 'fowler',
};
