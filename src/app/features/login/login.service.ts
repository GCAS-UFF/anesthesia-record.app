import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { LoginCredentials } from './login.model';

/**
 * Serviço de autenticação (mock).
 * Substitua pela integração real com API.
 */
@Injectable({ providedIn: 'root' })
export class LoginService {
  login(credentials: LoginCredentials): Observable<boolean> {
    // Mock: aceita qualquer usuário/senha não vazios
    if (credentials.username && credentials.password) {
      return of(true).pipe(delay(1000));
    }
    return throwError(() => 'Usuário ou senha inválidos');
  }
}
