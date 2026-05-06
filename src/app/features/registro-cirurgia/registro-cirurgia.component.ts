import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-registro-cirurgia',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-content class="ion-padding">
      <h1>Registro da Cirurgia (Histórico)</h1>
      <p>Paciente ID: {{ pacienteId }}</p>
      <ion-button (click)="voltar()">Voltar</ion-button>
    </ion-content>
  `,
  styles: [`
    :host { display: block; height: 100%; background: #f1f5f9; }
  `]
})
export class RegistroCirurgiaComponent implements OnInit {
  pacienteId: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.pacienteId = this.route.snapshot.paramMap.get('id');
  }

  voltar() {
    this.router.navigate(['/tabs/tab1']);
  }
}
