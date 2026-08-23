import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginFacade } from './login.facade';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { CustomInputComponent } from '../../shared/components/custom-input/custom-input.component';
import { LoadingButtonComponent } from '../../shared/components/loading-button/loading-button.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ConnectionStatusComponent } from '../../shared/components/connection-status/connection-status.component';

import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { catchError, interval, of, startWith, Subscription, switchMap } from 'rxjs';
import { addIcons } from 'ionicons';
import { wifiOutline, cloudOutline, informationCircleOutline } from 'ionicons/icons';
import { HealthService } from 'src/app/core/services/health.service';
import { IonIcon } from "@ionic/angular/standalone";

/**
 * LoginPage
 * Standalone component for user authentication.
 * MVVM: View delegates logic to LoginFacade.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonIcon, 
    CommonModule,
    ReactiveFormsModule,
    CustomInputComponent,
    LoadingButtonComponent,
    ErrorMessageComponent
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  providers: [LoginFacade]
})
export class LoginPage implements OnInit, OnDestroy {
  form: FormGroup;
  loading = false;
  error: string | null = null;

  serverConnected = false;
  aghuConnected = false;

  private healthSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    public facade: LoginFacade,
    private authService: AuthService,
    private router: Router,
    private healthService: HealthService,
    private alertController: AlertController
  ) {
    addIcons({
      wifiOutline,
      cloudOutline,
      informationCircleOutline
    });

    const lastCRM = this.authService.getLastCRM();

    this.form = this.fb.group({
      username: [lastCRM, Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnDestroy(): void {
    this.healthSubscription?.unsubscribe();
  }

  ngOnInit() {
    this.startHealthCheck();
  }

  /**
   * Handles login form submission.
   */
  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;

    const { username, password } = this.form.value;

    this.facade.login({ username, password })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/pacientes']);
        },
        error: err => {
          this.error = err;
          this.loading = false;
        }
      });
  }

  private startHealthCheck(): void {
    this.healthSubscription = interval(10000)
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

  /**
   * Clears the current error message.
   */
  clearError() {
    this.error = null;
  }

  async esqueceuSenha(event: Event): Promise<void> {
    event.preventDefault();

    const alert = await this.alertController.create({
      header: 'Esqueceu a senha?',
      message: 'O acesso utiliza o mesmo usuário e senha do sistema AGHU. Para redefinir sua senha, entre em contato com a equipe de TI responsável pelo AGHU.',
      buttons: ['Entendi']
    });

    await alert.present();
  }
}
