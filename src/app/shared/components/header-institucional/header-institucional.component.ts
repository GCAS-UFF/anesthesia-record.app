import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

/**
 * FA-028 - Header institucional reutilizável
 * Exibe logo e nome do sistema.
 */
@Component({
  selector: 'app-header-institucional',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './header-institucional.component.html',
  styleUrls: ['./header-institucional.component.scss']
})
export class HeaderInstitucionalComponent {
  /** Caminho do logo (opcional) */
  @Input() logo: string = 'assets/logo.png';
  /** Nome do sistema */
  @Input() title: string = 'Ficha Anestésica';
  /** Exibe botão de sair */
  @Input() showLogout: boolean = false;

  /** Exibe informações do médico */
  @Input() showDoctorInfo: boolean = true;

  constructor(private router: Router) {}

  logout() {
    this.router.navigate(['/login']);
  }
}
