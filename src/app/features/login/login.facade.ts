import { Injectable } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { LoginCredentials } from './login.model';
import { Observable } from 'rxjs';

/**
 * Fachada para encapsular lógica de autenticação (MVVM).
 */
@Injectable()
export class LoginFacade {
  constructor(private authService: AuthService) {}

  /**
   * Realiza login com as credenciais fornecidas.
   */
  login(credentials: LoginCredentials): Observable<boolean> {
    return this.authService.login(credentials);
  }
}
