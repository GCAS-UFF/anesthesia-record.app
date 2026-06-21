import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, catchError, tap } from 'rxjs/operators';
import { LoginCredentials } from '../../features/login/login.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedInUser: any = null;

  constructor(private http: HttpClient) {
    this.checkSavedSession();
  }

  /**
   * Performs user login against the real API.
   * Se a API falhar, cai no fallback mockado temporariamente.
   */
  login(credentials: LoginCredentials): Observable<boolean> {
    const url = `${environment.apiUrl}/Auth/login`;
    const payload = { 
      login: credentials.username, 
      password: credentials.password 
    };

    return this.http.post<any>(url, payload).pipe(
      tap(response => {
        const token = response.data?.token || response.token || `token_${credentials.username}_${Date.now()}`;
        const userId = response.data?.usuario?.id || response.data?.id || 8;
        this.loggedInUser = { 
          username: credentials.username, 
          name: response.data?.usuario?.nome || response.data?.name || 'Médico Logado',
          id: userId
        };
        
        sessionStorage.setItem('userLoggedIn', 'true');
        sessionStorage.setItem('userCRM', credentials.username);
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('userId', userId.toString());
      }),
      map(() => true),
      catchError(err => {
        console.error('Erro na API de Login:', err);
        return throwError(() => 'Usuário ou senha inválidos, ou API indisponível.');
      })
    );
  }

  /**
   * Logs out the current user.
   */
  logout(): void {
    this.loggedInUser = null;
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userCRM');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('lastSavedCRM');
    localStorage.removeItem('rememberMePreference');
    sessionStorage.removeItem('userLoggedIn');
    sessionStorage.removeItem('userCRM');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userId');
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
   * Retrieves the current user's ID.
   */
  getCurrentUserId(): number {
    if (this.loggedInUser && this.loggedInUser.id) {
      return Number(this.loggedInUser.id);
    }
    const sessionUserId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    return sessionUserId ? Number(sessionUserId) : 8; // Retorna 8 (Admin) como fallback seguro
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
    const savedUserIdLocal = localStorage.getItem('userId');

    const savedUserSession = sessionStorage.getItem('userLoggedIn');
    const savedCRMSession = sessionStorage.getItem('userCRM');
    const savedUserIdSession = sessionStorage.getItem('userId');

    if (savedUserLocal === 'true' && savedCRMLocal) {
      this.loggedInUser = { 
        username: savedCRMLocal,
        id: savedUserIdLocal ? Number(savedUserIdLocal) : 8
      };
    } else if (savedUserSession === 'true' && savedCRMSession) {
      this.loggedInUser = { 
        username: savedCRMSession,
        id: savedUserIdSession ? Number(savedUserIdSession) : 8
      };
    }
  }
}
