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

  constructor(private fb: FormBuilder, public facade: LoginFacade, private router: Router) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  /**
   * Handles login form submission.
   */
  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    this.facade.login(this.form.value)
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
