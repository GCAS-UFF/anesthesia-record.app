// header-institucional.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
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
  cloudOutline,
} from 'ionicons/icons';
import { AuthService } from 'src/app/core/services/auth.service';
import { Subscription } from 'rxjs';

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
export class HeaderInstitucionalComponent implements OnInit, OnDestroy {
  @Input() doctorName: string = '';
  @Input() doctorCRM: string = '';
  @Input() doctorRole: string = '';
  @Input() doctorInitials: string = 'Dr(a)';
  @Input() serverConnected: boolean = true;

  menuOpen = false;
  private userSubscription: Subscription = new Subscription();

  navItems: NavItem[] = [
    { icon: 'grid-outline', label: 'Painel de Cirurgias', route: '/pacientes', active: true },
    { icon: 'settings-outline', label: 'Configurações', route: '/config' },
    { icon: 'people-outline', label: 'Meus Pacientes', route: '/meus-pacientes' },
    { icon: 'cloud-outline', label: 'Integração AGHU', route: '/integracoes' },
  ];

  constructor(private router: Router, private authService: AuthService) {
    addIcons({
      menuOutline,
      wifiOutline,
      gridOutline,
      documentTextOutline,
      peopleOutline,
      settingsOutline,
      helpCircleOutline,
      cloudOutline,
      logOutOutline,
      closeOutline,
    });
  }

  ngOnInit() {
    // Carrega os dados iniciais
    this.loadUserData();
    
    // Escuta mudanças no usuário (login, logout, refresh)
    this.userSubscription = this.authService.user$.subscribe(user => {
      if (user) {
        this.updateUserData(user);
      } else {
        // Usuário deslogado - pode limpar ou mostrar dados padrão
        this.doctorName = '';
        this.doctorRole = '';
        this.doctorInitials = 'Dr(a)';
      }
    });
  }

  ngOnDestroy() {
    // Limpa a inscrição para evitar memory leak
    this.userSubscription.unsubscribe();
  }

  loadUserData() {
    const user = this.authService.getUser();
    if (user) {
      this.updateUserData(user);
    } else {
      this.loadFromStorageFallback();
    }
  }

  private updateUserData(user: any) {
    this.doctorName = user.name || user.username || 'Não foi possível identificar o usuário logado';
    this.doctorRole = user.role || 'Médico';
    this.doctorInitials = this.getInitials(user.username || user.name || '');
  }

  private loadFromStorageFallback() {
    const name = sessionStorage.getItem('name') || localStorage.getItem('name');
    const role = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
    const username = sessionStorage.getItem('userCRM') || localStorage.getItem('userCRM');

    if (name) this.doctorName = name;
    if (role) this.doctorRole = role;
    if (username) this.doctorInitials = this.getInitials(username);
  }

  openMenu() {
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  getInitials(fullName: string): string {
    if (!fullName) return '';

    return fullName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }

  navigate(item: NavItem) {
    this.closeMenu();
    if (item.route) this.router.navigate([item.route]);
  }

  logout() {
    this.closeMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}