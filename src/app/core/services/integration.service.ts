import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from './api-url.service';

@Injectable({
  providedIn: 'root'
})
export class IntegrationService {
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
  }

  async syncEmployees(): Promise<any> {
    return await firstValueFrom(this.http.post<any>(`${this.apiUrlService.getBaseUrl()}/integrations/sync/professionals`, {}));
  }

  async syncMedications(): Promise<any> {
    return await firstValueFrom(this.http.post<any>(`${this.apiUrlService.getBaseUrl()}/integrations/sync/medicines`, {}));
  }

  syncProcedures() {
    return firstValueFrom(this.http.post<any>(`${this.apiUrlService.getBaseUrl()}/integrations/sync/procedures`, {})
    );
  }

  async getLastIntegraionTime(): Promise<any> {
    return firstValueFrom(this.http.get(`${this.apiUrlService.getBaseUrl()}/integrations/sync/last-integrations`)
    );
  }
}