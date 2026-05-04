import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LoginFacade } from './login.facade';
import { HeaderInstitucionalComponent } from 'src/app/shared/components/header-institucional/header-institucional.component';
import { CustomInputComponent } from 'src/app/shared/components/custom-input/custom-input.component';
import { LoadingButtonComponent } from 'src/app/shared/components/loading-button/loading-button.component';
import { ErrorMessageComponent } from 'src/app/shared/components/error-message/error-message.component';
import { ConnectionStatusComponent } from 'src/app/shared/components/connection-status/connection-status.component';

import { Router } from '@angular/router';

import { AuthService } from 'src/app/core/services/auth.service';

/**
 * LoginPage
 * Standalone component for user authentication.
 * MVVM: View delegates logic to LoginFacade.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    HeaderInstitucionalComponent,
    CustomInputComponent,
    LoadingButtonComponent,
    ErrorMessageComponent,
    ConnectionStatusComponent
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  providers: [LoginFacade]
})
export class LoginPage {
  form: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder, 
    public facade: LoginFacade, 
    private authService: AuthService,
    private router: Router
  ) {
    const lastCRM = this.authService.getLastCRM();
    const rememberMePref = this.authService.getRememberMePreference();
    this.form = this.fb.group({
      username: [lastCRM, [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [rememberMePref]
    });
  }

  /**
   * Handles login form submission.
   */
  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    
    const { username, password, rememberMe } = this.form.value;
    
    this.facade.login({ username, password }, rememberMe)
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/tabs/tab1']);
        },
        error: err => {
          this.error = err;
          this.loading = false;
        }
      });
  }

  /**
   * Clears the current error message.
   */
  clearError() {
    this.error = null;
  }
}
