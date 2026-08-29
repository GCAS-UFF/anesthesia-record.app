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
import { HeaderActionButton } from './header-action-button.model';

interface NavItem {
  icon: string;
  label: string;
  route?: string;
  active?: boolean;
  admin?: boolean;
  hideForAdmin?: boolean;
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
  @Input() preAnestesicaButtonLabel = '';
  @Input() showAnestesicaButton = false;
  @Input() anestesicaButtonLabel = '';
  @Input() actionButtons: HeaderActionButton[] = [];

  @Output() openPreAnestesica = new EventEmitter<void>();
  @Output() openAnestesica = new EventEmitter<void>();

  doctorId = 0;
  isAdmin = false;
  hospitalName = '';
  private isLoggingOut = false;
  private userSubscription = new Subscription();
  private hospitalNameSubscription = new Subscription();

  menuOpen = false;
  userMenuOpen = false;

  navItems: NavItem[] = [    
    {
      icon: 'people-outline',
      label: 'Todos os Pacientes',
      route: '/pacientes',
      active: true
    },
    {
      icon: 'person-outline',
      label: 'Meus Pacientes',
      route: '/meus-pacientes',
      hideForAdmin: true
    },
    // Admin
      {
      icon: 'cloud-outline',
      label: 'Acompanhamento de Integrações',
      route: '/integracoes/fichas'
    },
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
      icon: 'analytics-outline',
      label: 'Relatórios (Admin)',
      route: '/admin/relatorios',
      admin: true
    },
    // {
    //   icon: 'file-tray-full-outline',
    //   label: 'Histórico de Fichas (Admin)',
    //   route: '/admin/historico-fichas',
    //   admin: true
    // }    
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
    this.hospitalName = this.authService.getHospitalName();

    this.userSubscription = this.authService.user$.subscribe(user => {
      if (!user) {
        this.redirectToLogin();
        return;
      }

      this.updateUserData(user);
    });

    this.hospitalNameSubscription = this.authService.hospitalName$.subscribe(hospitalName => {
      this.hospitalName = hospitalName;
    });
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
    this.hospitalNameSubscription.unsubscribe();
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
    this.isAdmin = user.isAdmin === true;
    this.doctorRole = this.isAdmin ? 'Administrador' : (user.role || 'Médico');
    this.doctorInitials = this.getInitials(user.username || user.name || '');
  }

  private loadFromStorageFallback(): void {
    const name = sessionStorage.getItem('name') || localStorage.getItem('name');
    const role = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
    const username = sessionStorage.getItem('userCRM') || localStorage.getItem('userCRM');
    const isAdmin = sessionStorage.getItem('isAdmin') || localStorage.getItem('isAdmin');

    if (isAdmin) this.isAdmin = JSON.parse(isAdmin) === true;
    if (name) this.doctorName = name;
    if (username) this.doctorInitials = this.getInitials(username);
    this.doctorRole = this.isAdmin ? 'Administrador' : (role || this.doctorRole);
  }

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter(item => {
      if (item.hideForAdmin && this.isAdmin) return false;
      if (item.admin && !this.isAdmin) return false;
      return true;
    });
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

  onActionButtonClick(btn: HeaderActionButton): void {
    if (btn.disabled) return;
    btn.action();
  }


  trackActionButton(_index: number, btn: HeaderActionButton): string {
    return btn.id;
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
    this.router.navigate(['/settings']);
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
            this.authService.logout();
            this.redirectToLogin();
          }
        }
      ]
    });

    await alert.present();
  }

  private redirectToLogin(): void {
    this.isLoggingOut = true;
    this.closeUserMenu();
    this.router.navigate(['/login'], { replaceUrl: true });
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