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
import { catchError, interval, of, startWith, Subscription, switchMap } from 'rxjs';
import { HealthService } from 'src/app/core/services/health.service';

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
  doctorId: number = 0;
  @Input() doctorInitials: string = 'Dr(a)';

  serverConnected = false;
  aghuConnected = false;

  private healthSubscription?: Subscription;

  menuOpen = false;
  private userSubscription: Subscription = new Subscription();

  navItems: NavItem[] = [
    { icon: 'grid-outline', label: 'Painel de Cirurgias', route: '/pacientes', active: true },
    { icon: 'settings-outline', label: 'Configurações', route: '/config' },
    { icon: 'people-outline', label: 'Meus Pacientes', route: '/meus-pacientes' },
    { icon: 'cloud-outline', label: 'Integração AGHU', route: '/integracoes' },
  ];

  constructor(private router: Router, private authService: AuthService, private healthService: HealthService) {
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
    this.loadUserData();

    this.userSubscription = this.authService.user$.subscribe(user => {
      if (user) {
        this.updateUserData(user);
      } else {
        this.logout();
      }
    });

    this.startHealthCheck();
  }

  ngOnDestroy() {
    this.userSubscription.unsubscribe();
    this.healthSubscription?.unsubscribe();
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
    this.doctorId = user.id;
    this.doctorName = user.name || user.username || 'Erro';
    this.doctorRole = user.role || 'Médico';
    this.doctorInitials = this.getInitials(user.username || user.name || '');
  }

  private loadFromStorageFallback() {
    const id = sessionStorage.getItem('userId') || localStorage.getItem('userId')
    const name = sessionStorage.getItem('name') || localStorage.getItem('name');
    const role = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
    const username = sessionStorage.getItem('userCRM') || localStorage.getItem('userCRM');

    if (name)
      this.doctorName = name;

    if (role)
      this.doctorRole = role;

    if (username)
      this.doctorInitials = this.getInitials(username);
  }

  openMenu() {
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  private startHealthCheck(): void {
     this.healthSubscription = interval(15000)
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
       });
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

    if (!item.route) 
      return;

    if (item.route === '/meus-pacientes') {
      this.router.navigate(['/meus-pacientes', this.doctorId]);
      return;
    }

    this.router.navigate([item.route]);
  }

  logout() {
    this.closeMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}