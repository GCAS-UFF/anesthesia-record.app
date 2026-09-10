import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

export const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US', 'es-ES'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'pt-BR';

const STORAGE_KEY = 'appLanguage';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  constructor(private translate: TranslateService) {
    this.translate.addLangs([...SUPPORTED_LANGUAGES]);
  }

  async init(): Promise<void> {
    await firstValueFrom(this.translate.use(this.resolveInitialLanguage()));
  }

  async setLanguage(lang: string): Promise<void> {
    const resolved = this.normalize(lang);
    localStorage.setItem(STORAGE_KEY, resolved);
    await firstValueFrom(this.translate.use(resolved));
  }

  getCurrentLanguage(): string {
    return this.translate.getCurrentLang() ?? DEFAULT_LANGUAGE;
  }

  private resolveInitialLanguage(): SupportedLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && this.isSupported(stored) ? stored : DEFAULT_LANGUAGE;
  }

  private normalize(lang: string): SupportedLanguage {
    return this.isSupported(lang) ? lang : DEFAULT_LANGUAGE;
  }

  private isSupported(lang: string): lang is SupportedLanguage {
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
  }
}
