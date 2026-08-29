import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { StorageService } from './storage.service';
import { ApiUrlService } from './api-url.service';

@Injectable({
  providedIn: 'root'
})
export class MasterDataService {

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private apiUrlService: ApiUrlService
  ) { }

  getProfessionals() {
    return this.http.get<any[]>(`${this.apiUrlService.getBaseUrl()}/professionals`);
  }

  getProcedures() {
    return this.http.get<any[]>(`${this.apiUrlService.getBaseUrl()}/procedures`);
  }

  getMedications() {
    return this.http.get<any[]>(`${this.apiUrlService.getBaseUrl()}/drugs`);
  }

  getEvents() {
    return this.http.get<any>(`${this.apiUrlService.getBaseUrl()}/event-types`);
  }

  saveProfessionals(list: any[]) {
    this.storage.set('cache_professionals', list);
  }

  saveProcedures(list: any[]) {
    this.storage.set('cache_procedures', list);
  }

  saveMedications(list: any[]) {
    this.storage.set('cache_medications', list);
  }

  saveEvents(list: any[]) {
    this.storage.set('cache_events', list);
  }

  getProfessionalsCache() {
    return this.storage.get<any[]>('cache_professionals') ?? [];
  }

  getProceduresCache() {
    return this.storage.get<any[]>('cache_procedures') ?? [];
  }

  getMedicationsCache() {
    return this.storage.get<any[]>('cache_medications') ?? [];
  }

  getEventsCache() {
    return this.storage.get<any[]>('cache_events') ?? [];
  }

  hasCache(): boolean {
    return this.storage.has('cache_professionals')
      && this.storage.has('cache_procedures')
      && this.storage.has('cache_medications')
      && this.storage.has('cache_events');
  }

  downloadMasterData() {
    return forkJoin({
      professionals: this.getProfessionals(),
      procedures: this.getProcedures(),
      medications: this.getMedications(),
      events: this.getEvents()
    });
  }
}