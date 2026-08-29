import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { LoginCredentials } from '../../features/login/login.model';
import { StorageService } from './storage.service';
import { ApiUrlService } from './api-url.service';

interface UserData {
  username: string;
  name: string;
  id: number;
  sector: string;
  role: string;
  isAdmin: boolean;
  email: string;
}

interface AuthResponse {
  data?: {
    token?: string;
    usuario?: {
      id: number;
      nome: string;
      email: string;
      login: string;
      sector: string;
      role: string;
      isAdmin?: boolean;
    };
  };
}

interface StoredSession {
  userLoggedIn: boolean;
  userCRM: string;
  authToken: string;
  userId: number;
  name: string;
  userSector: string;
  userRole: string;
  isAdmin: boolean;
  userEmail: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly SESSION_KEYS = {
    USER_LOGGED_IN: 'userLoggedIn',
    USER_CRM: 'userCRM',
    AUTH_TOKEN: 'authToken',
    USER_ID: 'userId',
    NAME: 'name',
    USER_SECTOR: 'userSector',
    USER_ROLE: 'userRole',
    IS_ADMIN: 'isAdmin',
    USER_EMAIL: 'userEmail',
    LAST_SAVED_CRM: 'lastSavedCRM',
    REMEMBER_ME: 'rememberMePreference',
    CACHE_PROFESSIONALS: 'cache_professionals',
    CACHE_PROCEDURES: 'cache_procedures',
    CACHE_medications: 'cache_medications'
  } as const;

  private loggedInUser: UserData | null = null;
  private userSubject = new BehaviorSubject<UserData | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private apiUrlService: ApiUrlService
  ) {
    this.checkSavedSession();
  }

  login(credentials: LoginCredentials): Observable<boolean> {
    const url = `${this.apiUrlService.getBaseUrl()}/Auth/login`;
    const payload = {
      login: credentials.username,
      password: credentials.password
    };

    return this.http.post<AuthResponse>(url, payload).pipe(
      tap(response => this.handleLoginResponse(response, credentials)),
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

    Object.values(this.SESSION_KEYS).forEach(key => {
      this.storageService.remove(key);
      localStorage.removeItem(key);
    });
  }

  isAuthenticated(): boolean {
    return (
      this.loggedInUser !== null ||
      this.storageService.get<boolean>(this.SESSION_KEYS.USER_LOGGED_IN) === true ||
      localStorage.getItem(this.SESSION_KEYS.USER_LOGGED_IN) === 'true'
    );
  }

  getUser(): UserData | null {
    return this.loggedInUser;
  }

  isAdmin(): boolean {
    return this.getUser()?.isAdmin === true;
  }

  getCurrentUserId(): number {
    if (this.loggedInUser?.id) {
      return this.loggedInUser.id;
    }

    const sessionUserId = this.storageService.get<number>(this.SESSION_KEYS.USER_ID);
    const localUserId = localStorage.getItem(this.SESSION_KEYS.USER_ID);

    return sessionUserId ?? (localUserId ? Number(localUserId) : 8);
  }

  getLastCRM(): string {
    return localStorage.getItem(this.SESSION_KEYS.LAST_SAVED_CRM) || '';
  }

  getRememberMePreference(): boolean {
    return localStorage.getItem(this.SESSION_KEYS.REMEMBER_ME) === 'true';
  }

  private handleLoginResponse(response: AuthResponse, credentials: LoginCredentials): void {
    const token = this.extractToken(response);
    const userData = this.extractUserData(response, credentials);

    this.loggedInUser = userData;
    this.userSubject.next(userData);

    const session: StoredSession = {
      userLoggedIn: true,
      userCRM: userData.username,
      authToken: token,
      userId: userData.id,
      name: userData.name,
      userSector: userData.sector,
      userRole: userData.role,
      isAdmin: userData.isAdmin,
      userEmail: userData.email
    };

    Object.entries(session).forEach(([key, value]) => {
      this.storageService.set(key, value);
    });
  }

  private extractToken(response: AuthResponse): string {
    return response.data?.token || `token_${Date.now()}`;
  }

  private extractUserData(response: AuthResponse, credentials: LoginCredentials): UserData {
    const user = response.data?.usuario || response.data || {};

    if (!user)
      this.logout();

    return {
      username: credentials.username,
      name: response.data?.usuario?.nome || '',
      id: response.data?.usuario?.id || 0,
      sector: response.data?.usuario?.sector || '',
      role: response.data?.usuario?.role || '',
      isAdmin: response.data?.usuario?.isAdmin === true,
      email: response.data?.usuario?.email || ''
    };
  }

  private checkSavedSession(): void {
    const userData = this.getUserFromStorage('sessionStorage') ??
      this.getUserFromStorage('localStorage');

    if (userData) {
      this.loggedInUser = userData;
      this.userSubject.next(userData);
    }
  }

  private getUserFromStorage(storageType: 'sessionStorage' | 'localStorage'): UserData | null {
    const storage = storageType === 'sessionStorage' ? this.storageService : localStorage;

    const isLoggedIn = storageType === 'sessionStorage'
      ? this.storageService.get<boolean>(this.SESSION_KEYS.USER_LOGGED_IN)
      : localStorage.getItem(this.SESSION_KEYS.USER_LOGGED_IN) === 'true';

    if (!isLoggedIn) return null;

    const username = storageType === 'sessionStorage'
      ? this.storageService.get<string>(this.SESSION_KEYS.USER_CRM)
      : localStorage.getItem(this.SESSION_KEYS.USER_CRM);

    if (!username) return null;

    const getId = (): number => {
      if (storageType === 'sessionStorage') {
        return this.storageService.get<number>(this.SESSION_KEYS.USER_ID) ?? 8;
      }
      return Number(localStorage.getItem(this.SESSION_KEYS.USER_ID)) || 8;
    };

    const getString = (key: string): string => {
      if (storageType === 'sessionStorage') {
        return this.storageService.get<string>(key) || '';
      }
      return localStorage.getItem(key) || '';
    };

    const getIsAdmin = (): boolean => {
      if (storageType === 'sessionStorage') {
        return this.storageService.get<boolean>(this.SESSION_KEYS.IS_ADMIN) === true;
      }
      return localStorage.getItem(this.SESSION_KEYS.IS_ADMIN) === 'true';
    };

    return {
      username: username as string,
      id: getId(),
      name: getString(this.SESSION_KEYS.NAME) || 'Usuário',
      role: getString(this.SESSION_KEYS.USER_ROLE) || 'Médico',
      sector: getString(this.SESSION_KEYS.USER_SECTOR) || 'Setor Desconhecido',
      isAdmin: getIsAdmin(),
      email: getString(this.SESSION_KEYS.USER_EMAIL)
    };
  }
}