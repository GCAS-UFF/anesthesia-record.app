import { Component, Input, OnInit, OnDestroy, HostListener, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  gridOutline,
  peopleOutline,
  personOutline,
  settingsOutline,
  logOutOutline,
  closeOutline,
  chevronDownOutline,
  arrowBackOutline,
  downloadOutline,
  documentTextOutline,
  medkit,
  layersOutline,
  analyticsOutline,
  fileTrayFullOutline,
  trashBinOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';

interface NavItem {
  icon: string;
  label: string;
  route?: string;
  active?: boolean;
  admin?: boolean;
}

@Component({
  selector: 'app-header-institucional',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './header-institucional.component.html',
  styleUrls: ['./header-institucional.component.scss'],
})
export class HeaderInstitucionalComponent implements OnInit, OnDestroy {
  @Input() doctorName = '';
  @Input() doctorCRM = '';
  @Input() doctorRole = '';
  @Input() showBackButton = false;
  @Input() doctorInitials = 'Dr(a)';
  @Input() showPreAnestesicaButton = false;
  @Input() preAnestesicaButtonLabel = 'Ficha Pré-Anestésica';
  @Input() showAnestesicaButton = false;
  @Input() anestesicaButtonLabel = 'Ficha Anestésica';

  @Output() openPreAnestesica = new EventEmitter<void>();
  @Output() openAnestesica = new EventEmitter<void>();

  doctorId = 0;
  private isLoggingOut = false;
  private userSubscription = new Subscription();

  menuOpen = false;
  userMenuOpen = false;

  navItems: NavItem[] = [
    // Comum
    {
      icon: 'people-outline',
      label: 'Todos os Pacientes',
      route: '/pacientes',
      active: true
    },
    {
      icon: 'person-outline',
      label: 'Meus Pacientes',
      route: '/meus-pacientes'
    },
    // Admin
    {
      icon: 'layers-outline',
      label: 'Manutenção de Itens (Admin)',
      route: '/admin/manutencao-itens',
      admin: true
    },
    {
      icon: 'download-outline',
      label: 'Obter dados AGHU (Admin)',
      route: '/admin/integracoes',
      admin: true
    },
    {
      icon: 'cloud-outline',
      label: 'Acompanhamento de Integrações',
      route: '/integracoes/fichas',
      admin: true
    },
    {
      icon: 'analytics-outline',
      label: 'Relatórios (Admin)',
      route: '/admin/relatorios',
      admin: true
    },
    {
      icon: 'file-tray-full-outline',
      label: 'Histórico de Fichas (Admin)',
      route: '/admin/historico-fichas',
      admin: true
    }    
  ];

  constructor(
    private router: Router,
    private location: Location,
    private authService: AuthService,
    private alertController: AlertController
  ) {
    addIcons({
      arrowBackOutline,
      menuOutline,
      gridOutline,
      peopleOutline,
      personOutline,
      settingsOutline,
      downloadOutline,
      logOutOutline,
      closeOutline,
      chevronDownOutline,
      documentTextOutline,
      medkit,
      layersOutline,
      analyticsOutline,
      fileTrayFullOutline,
      trashBinOutline
    });
  }

  ngOnInit(): void {
    this.loadUserData();

    this.userSubscription = this.authService.user$.subscribe(user => {
      if (!user) {
        this.handleLogout();
        return;
      }

      this.updateUserData(user);
    });
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
  }

  loadUserData(): void {
    const user = this.authService.getUser();

    if (user) {
      this.updateUserData(user);
    } else {
      this.loadFromStorageFallback();
    }
  }

  private updateUserData(user: any): void {
    this.doctorId = user.id;
    this.doctorName = user.name || user.username || 'Erro';
    this.doctorRole = user.role || 'Médico';
    this.doctorInitials = this.getInitials(user.username || user.name || '');
  }

  private loadFromStorageFallback(): void {
    const name = sessionStorage.getItem('name') || localStorage.getItem('name');
    const role = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
    const username = sessionStorage.getItem('userCRM') || localStorage.getItem('userCRM');

    if (name) this.doctorName = name;
    if (role) this.doctorRole = role;
    if (username) this.doctorInitials = this.getInitials(username);
  }

  openMenu(): void {
    this.menuOpen = true;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  voltar(): void {
    this.location.back();
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(event?: Event): void {
    event?.stopPropagation();
    this.userMenuOpen = false;
  }

  goToSettings(): void {
    this.closeUserMenu();
    this.router.navigate(['/configuracoes']);
  }

  async handleLogout(): Promise<void> {
    if (this.isLoggingOut) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Sair',
      message: 'Deseja realmente sair da aplicação?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sair',
          role: 'destructive',
          handler: () => {
            this.isLoggingOut = true;
            this.closeUserMenu();
            this.authService.logout();
            this.router.navigate(['/login'], { replaceUrl: true });
          }
        }
      ]
    });

    await alert.present();
  }

  navigate(item: NavItem): void {
    this.closeMenu();

    if (!item.route) {
      return;
    }

    if (item.route === '/meus-pacientes') {
      this.router.navigate(['/meus-pacientes', this.doctorId]);
      return;
    }

    this.router.navigate([item.route]);
  }

  getInitials(fullName: string): string {
    if (!fullName) {
      return '';
    }

    return fullName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.doctor-chip')) {
      this.userMenuOpen = false;
    }
  }
}