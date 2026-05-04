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
    const VALID_CREDENTIALS = [
      { username: "123456", password: "senha123" },
      { username: "12345678900", password: "senha123" }
    ];

    const isValid = VALID_CREDENTIALS.some(cred => 
      cred.username === credentials.username && cred.password === credentials.password
    );

    if (isValid) {
      return of(true).pipe(delay(1000));
    }
    return throwError(() => 'CRM/CPF ou senha inválidos. Tente novamente.').pipe(delay(500));
  }
}
