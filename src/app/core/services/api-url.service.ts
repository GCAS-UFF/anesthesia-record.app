import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'siga_api_url';

@Injectable({
  providedIn: 'root'
})
export class ApiUrlService {
  private urlSubject = new BehaviorSubject<string | null>(this.readStoredUrl());
  readonly url$ = this.urlSubject.asObservable();

  hasUrl(): boolean {
    return !!this.urlSubject.value;
  }

  getRawUrl(): string | null {
    return this.urlSubject.value;
  }

  getBaseUrl(): string {
    const raw = this.urlSubject.value;
    return raw ? `${raw}/api` : '';
  }

  setUrl(rawUrl: string): void {
    const normalized = ApiUrlService.normalize(rawUrl);
    localStorage.setItem(STORAGE_KEY, normalized);
    this.urlSubject.next(normalized);
  }

  clearUrl(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.urlSubject.next(null);
  }

  static normalize(rawUrl: string): string {
    return (rawUrl || '').trim().replace(/\/+$/, '');
  }

  static healthUrlFor(rawUrl: string): string {
    return `${ApiUrlService.normalize(rawUrl)}/api/health`;
  }

  private readStoredUrl(): string | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? stored.trim() : null;
  }
}
