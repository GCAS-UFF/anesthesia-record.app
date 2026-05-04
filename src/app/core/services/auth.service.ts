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
  login(credentials: LoginCredentials): Observable<boolean> {
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
      localStorage.setItem('userLoggedIn', 'true');
      localStorage.setItem('userCRM', user.username);
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
  }

  /**
   * Checks if the user is authenticated.
   */
  isAuthenticated(): boolean {
    return this.loggedInUser !== null || localStorage.getItem('userLoggedIn') === 'true';
  }

  /**
   * Returns the logged in user info.
   */
  getUser() {
    return this.loggedInUser;
  }

  private checkSavedSession() {
    const savedUser = localStorage.getItem('userLoggedIn');
    const savedCRM = localStorage.getItem('userCRM');
    if (savedUser === 'true' && savedCRM) {
      this.loggedInUser = { username: savedCRM };
    }
  }
}
