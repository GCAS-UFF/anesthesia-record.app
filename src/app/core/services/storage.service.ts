import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  set<T>(key: string, value: T): void {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  get<T>(key: string): T | null {
    const value = sessionStorage.getItem(key);

    if (!value)
      return null;

    return JSON.parse(value) as T;
  }

  remove(key: string): void {
    sessionStorage.removeItem(key);
  }

  has(key: string): boolean {
    return sessionStorage.getItem(key) !== null;
  }

  clear(): void {
    sessionStorage.clear();
  }
}