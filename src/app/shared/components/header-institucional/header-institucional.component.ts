import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  wifiOutline,
  gridOutline,
  documentTextOutline,
  peopleOutline,
  settingsOutline,
  helpCircleOutline,
  logOutOutline,
  closeOutline,
} from 'ionicons/icons';

interface NavItem {
  icon: string;
  label: string;
  route?: string;
  active?: boolean;
}

@Component({
  selector: 'app-header-institucional',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './header-institucional.component.html',
  styleUrls: ['./header-institucional.component.scss'],
})
export class HeaderInstitucionalComponent {
  @Input() huapLogo: string = 'assets/huap-logo.jpeg';
  @Input() uffLogo: string = 'assets/uff-logo.png';
  @Input() doctorName: string = 'Dr. Ribeiro';
  @Input() doctorRole: string = 'Anestesista';
  @Input() doctorInitials: string = 'DR';
  @Input() serverConnected: boolean = true;

  menuOpen = false;

  navItems: NavItem[] = [
    { icon: 'grid-outline', label: 'Painel de Cirurgias', route: '/', active: true },
    { icon: 'document-text-outline', label: 'Fichas Anestésicas', route: '/fichas' },
    { icon: 'people-outline', label: 'Meus Pacientes', route: '/pacientes' },
    { icon: 'settings-outline', label: 'Configurações', route: '/config' },
    { icon: 'help-circle-outline', label: 'Ajuda & Suporte', route: '/ajuda' },
  ];

  constructor(private router: Router) {
    addIcons({
      menuOutline,
      wifiOutline,
      gridOutline,
      documentTextOutline,
      peopleOutline,
      settingsOutline,
      helpCircleOutline,
      logOutOutline,
      closeOutline,
    });
  }

  openMenu() {
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  navigate(item: NavItem) {
    this.closeMenu();
    if (item.route) this.router.navigate([item.route]);
  }

  logout() {
    this.closeMenu();
    this.router.navigate(['/login']);
  }
}