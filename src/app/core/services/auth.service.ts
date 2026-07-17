import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject, interval } from 'rxjs';
import { map, catchError, tap, startWith } from 'rxjs/operators';
import { LoginCredentials } from '../../features/login/login.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedInUser: any = null;

  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkSavedSession();
  }


  login(credentials: LoginCredentials): Observable<boolean> {
    const url = `${environment.apiUrl}/Auth/login`;
    const payload = {
      login: credentials.username,
      password: credentials.password
    };

    return this.http.post<any>(url, payload).pipe(
      tap(response => {
        const token = response.data?.token || response.token || `token_${credentials.username}_${Date.now()}`;
        const userId = response.data?.usuario?.id || response.data?.id || 0;

        this.loggedInUser = {
          username: credentials.username,
          name: response.data?.usuario?.nome || response.data?.name || 'Médico Logado',
          id: userId,
          sector: response.data?.usuario?.sector || 'Setor Desconhecido',
          role: response.data?.usuario?.role || 'Anestesista'
        };

        sessionStorage.setItem('userLoggedIn', 'true');
        sessionStorage.setItem('userCRM', credentials.username);
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('userId', userId.toString());
        sessionStorage.setItem('userSector', this.loggedInUser.sector);
        sessionStorage.setItem('userRole', this.loggedInUser.role);
        sessionStorage.setItem('name', this.loggedInUser.name);

        this.userSubject.next(this.loggedInUser);
      }),
      map(() => true),
      catchError(err => {
        console.error('Erro na API de Login:', err);
        return throwError(() => 'Usuário ou senha inválidos, ou API indisponível.');
      })
    );
  }

  logout(): void {
    this.loggedInUser = null;
    this.userSubject.next(null);

    const keys = ['userLoggedIn', 'userCRM', 'authToken', 'userId', 'name', 'userSector', 'userRole', 'lastSavedCRM', 'rememberMePreference'];

    keys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  isAuthenticated(): boolean {
    return (
      this.loggedInUser !== null ||
      localStorage.getItem('userLoggedIn') === 'true' ||
      sessionStorage.getItem('userLoggedIn') === 'true'
    );
  }

  getUser() {
    return this.loggedInUser;
  }

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
    let userData = this.getUserFromStorage('sessionStorage');

    if (!userData) {
      userData = this.getUserFromStorage('localStorage');
    }

    if (userData) {
      this.loggedInUser = userData;
      this.userSubject.next(this.loggedInUser);
    }
  }

  private getUserFromStorage(storageType: 'sessionStorage' | 'localStorage'): any {
    const storage = storageType === 'sessionStorage' ? sessionStorage : localStorage;

    const isLoggedIn = storage.getItem('userLoggedIn');
    if (isLoggedIn !== 'true')
      return null;

    const username = storage.getItem('userCRM');
    if (!username)
      return null;

    return {
      username: username,
      id: Number(storage.getItem('userId')) || 8,
      name: storage.getItem('name') || 'Usuário',
      role: storage.getItem('userRole') || 'Médico',
      sector: storage.getItem('userSector') || 'Setor Desconhecido'
    };
  }
}