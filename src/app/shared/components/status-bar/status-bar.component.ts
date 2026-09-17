import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  wifiOutline,
  cloudOutline,
  cloudUploadOutline,
  syncOutline,
  menuOutline,
  closeOutline,
  chevronDownOutline,
  peopleOutline,
  personOutline,
  settingsOutline,
  logOutOutline,
  layersOutline,
  downloadOutline,
  analyticsOutline,
} from 'ionicons/icons';
import { catchError, interval, of, startWith, Subscription, switchMap } from 'rxjs';
import { HealthService } from 'src/app/core/services/health.service';
import { SyncStatus } from 'src/app/core/enums/sync-statut.enum';
import { AnesthesiaRecordService } from 'src/app/core/services/anesthesia-record.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

interface NavItem {
  icon: string;
  labelKey: string;
  route?: string;
  active?: boolean;
  admin?: boolean;
  hideForAdmin?: boolean;
}

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule, IonicModule, TranslatePipe],
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.scss']
})
export class StatusBarComponent implements OnInit, OnDestroy {
  serverConnected = false;
  aghuConnected = false;

  SyncStatus = SyncStatus;
  syncStatus: SyncStatus = SyncStatus.Synced;
  pendingDrafts = 0;

  private healthSubscription?: Subscription;
  private draftSubscription?: Subscription;

  
  doctorId = 0;
  doctorName = '';
  doctorCRM = '';
  doctorRole = '';
  doctorInitials = 'Dr(a)';
  isAdmin = false;
  hospitalName = '';

  menuOpen = false;
  userMenuOpen = false;

  private isLoggingOut = false;
  private userSubscription = new Subscription();
  private hospitalNameSubscription = new Subscription();

  navItems: NavItem[] = [
    {
      icon: 'people-outline',
      labelKey: 'header.nav.allPatients',
      route: '/pacientes',
      active: true
    },
    {
      icon: 'person-outline',
      labelKey: 'header.nav.myPatients',
      route: '/meus-pacientes',
      hideForAdmin: true
    },
    {
      icon: 'cloud-outline',
      labelKey: 'header.nav.integrationsTracking',
      route: '/integracoes/fichas'
    },
    {
      icon: 'layers-outline',
      labelKey: 'header.nav.itemMaintenanceAdmin',
      route: '/admin/manutencao-itens',
      admin: true
    },
    {
      icon: 'download-outline',
      labelKey: 'header.nav.fetchAghuDataAdmin',
      route: '/admin/integracoes',
      admin: true
    },
    {
      icon: 'analytics-outline',
      labelKey: 'header.nav.reportsAdmin',
      route: '/admin/relatorios',
      admin: true
    },
  ];

  constructor(
    private healthService: HealthService,
    private anesthesiaRecordService: AnesthesiaRecordService,
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    private translate: TranslateService,
  ) {
    addIcons({
      wifiOutline,
      cloudOutline,
      cloudUploadOutline,
      syncOutline,
      menuOutline,
      closeOutline,
      chevronDownOutline,
      peopleOutline,
      personOutline,
      settingsOutline,
      logOutOutline,
      layersOutline,
      downloadOutline,
      analyticsOutline,
    });
  }

  ngOnInit() {
    this.draftSubscription =
      this.anesthesiaRecordService.pendingDraftsCount$
        .subscribe(count => {
          this.pendingDrafts = count;

          if (this.syncStatus === SyncStatus.Syncing) {
            return;
          }

          this.syncStatus =
            count > 0
              ? SyncStatus.Pending
              : SyncStatus.Synced;
        });

    this.startHealthCheck();

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

  ngOnDestroy() {
    this.healthSubscription?.unsubscribe();
    this.draftSubscription?.unsubscribe();
    this.userSubscription.unsubscribe();
    this.hospitalNameSubscription.unsubscribe();
  }

  private startHealthCheck(): void {
    this.healthSubscription = interval(60000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.healthService.checkHealth().pipe(
            catchError(() => of(null))
          )
        )
      )
      .subscribe(response => {
        if (!response?.data) {
          this.serverConnected = false;
          this.aghuConnected = false;
          return;
        }

        this.serverConnected = response.data.database;
        this.aghuConnected = response.data.aghu;

        this.anesthesiaRecordService.setServerStatus(
          response.data.database && response.data.aghu
        );
      });
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
      header: this.translate.instant('header.logoutConfirmTitle'),
      message: this.translate.instant('header.logoutConfirmMessage'),
      buttons: [
        {
          text: this.translate.instant('common.cancel'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('header.logout'),
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
