import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { LoginCredentials } from '../../features/login/login.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedInUser: any = null;

  constructor() {
    this.checkSavedSession();
  }

  /**
   * Performs user login against the mock credentials.
   */
  login(credentials: LoginCredentials, rememberMe: boolean = false): Observable<boolean> {
    const VALID_CREDENTIALS = [
      { username: '123456', password: 'senha123', name: 'Dra. Amanda Onishi' },
      { username: '12345678900', password: 'senha123', name: 'Dra. Amanda Onishi' },
      { username: '654321', password: 'senha456', name: 'Dr. Carlos Mendes' },
      { username: '98765432100', password: 'senha456', name: 'Dr. Carlos Mendes' }
    ];

    const user = VALID_CREDENTIALS.find(cred => 
      cred.username === credentials.username && cred.password === credentials.password
    );

    if (user) {
      this.loggedInUser = user;
      const mockToken = `token_${user.username}_${Date.now()}`;

      if (rememberMe) {
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userCRM', user.username);
        localStorage.setItem('authToken', mockToken);
      } else {
        sessionStorage.setItem('userLoggedIn', 'true');
        sessionStorage.setItem('userCRM', user.username);
        sessionStorage.setItem('authToken', mockToken);
      }

      // Save for CRM auto-fill
      if (rememberMe) {
        localStorage.setItem('lastSavedCRM', user.username);
        localStorage.setItem('rememberMePreference', 'true');
      } else {
        localStorage.removeItem('lastSavedCRM');
        localStorage.removeItem('rememberMePreference');
      }

      return of(true).pipe(delay(1000));
    }

    return throwError(() => 'CRM/CPF ou senha inválidos. Tente novamente.').pipe(delay(500));
  }

  /**
   * Logs out the current user.
   */
  logout(): void {
    this.loggedInUser = null;
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userCRM');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('userLoggedIn');
    sessionStorage.removeItem('userCRM');
    sessionStorage.removeItem('authToken');
    
    // Se o usuário optou por não se manter conectado ou removemos a preferencia
    if (localStorage.getItem('rememberMePreference') !== 'true') {
        localStorage.removeItem('lastSavedCRM');
    }
  }

  /**
   * Checks if the user is authenticated.
   */
  isAuthenticated(): boolean {
    return (
      this.loggedInUser !== null ||
      localStorage.getItem('userLoggedIn') === 'true' ||
      sessionStorage.getItem('userLoggedIn') === 'true'
    );
  }

  /**
   * Returns the logged in user info.
   */
  getUser() {
    return this.loggedInUser;
  }

  /**
   * Retrieves the last used CRM/CPF for auto-prefill.
   */
  getLastCRM(): string {
    return localStorage.getItem('lastSavedCRM') || '';
  }

  /**
   * Retrieves the explicit remember me preference.
   */
  getRememberMePreference(): boolean {
    return localStorage.getItem('rememberMePreference') === 'true';
  }

  private checkSavedSession() {
    const savedUserLocal = localStorage.getItem('userLoggedIn');
    const savedCRMLocal = localStorage.getItem('userCRM');

    const savedUserSession = sessionStorage.getItem('userLoggedIn');
    const savedCRMSession = sessionStorage.getItem('userCRM');

    if (savedUserLocal === 'true' && savedCRMLocal) {
      this.loggedInUser = { username: savedCRMLocal };
    } else if (savedUserSession === 'true' && savedCRMSession) {
      this.loggedInUser = { username: savedCRMSession };
    }
  }
}
