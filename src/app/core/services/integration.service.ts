import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IntegrationService {
  constructor(private http: HttpClient) {
  }

  async syncEmployees(): Promise<any> {
    return await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/integrations/sync/professionals`, {}));
  }

  async syncMedications(): Promise<any> {
    return await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/integrations/sync/medicines`, {}));
  }

  syncProcedures() {
    return firstValueFrom(this.http.post<any>(`${environment.apiUrl}/integrations/sync/procedures`, {})
    );
  }

  async getLastIntegraionTime(): Promise<any> {
    return firstValueFrom(this.http.get(`${environment.apiUrl}/integrations/sync/last-integrations`)
    );
  }
}