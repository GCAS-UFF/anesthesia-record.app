import { Injectable } from '@angular/core';
import { LoginService } from './login.service';
import { LoginCredentials } from './login.model';
import { Observable } from 'rxjs';

/**
 * Fachada para encapsular lógica de autenticação (MVVM).
 */
@Injectable()
export class LoginFacade {
  constructor(private service: LoginService) {}

  /**
   * Realiza login com as credenciais fornecidas.
   */
  login(credentials: LoginCredentials): Observable<boolean> {
    return this.service.login(credentials);
  }
}
