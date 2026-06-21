import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MonitoringPayload } from '../models/monitoring-payload.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MonitoringService {
  
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Busca os dados de monitorização da API
   */
  getMonitoringData(monitoringId: number): Observable<MonitoringPayload | null> {
    console.log(`[MonitoringService] Buscando dados de monitorização reais ID ${monitoringId}...`);
    return this.http.get<any>(`${this.baseUrl}/monitoring/${monitoringId}`).pipe(
      map(res => {
         if (res && res.data) {
            return res.data as MonitoringPayload;
         }
         return null;
      })
    );
  }

  /**
   * Cria um novo registro de monitorização na API
   */
  createMonitoringData(data: MonitoringPayload): Observable<any> {
    console.log(`[MonitoringService] Criando novo registro de monitorização...`, data);
    return this.http.post<any>(`${this.baseUrl}/monitoring`, data);
  }

  /**
   * Atualiza um registro existente de monitorização
   */
  updateMonitoringData(monitoringId: number, data: MonitoringPayload): Observable<any> {
    console.log(`[MonitoringService] Atualizando registro de monitorização ID ${monitoringId}...`, data);
    return this.http.put<any>(`${this.baseUrl}/monitoring/${monitoringId}`, data);
  }

  /**
   * Finaliza a monitorização
   */
  finalizeMonitoring(monitoringId: number): Observable<any> {
    console.log(`[MonitoringService] Finalizando registro de monitorização ID ${monitoringId}...`);
    return this.http.patch<any>(`${this.baseUrl}/monitoring/${monitoringId}`, {});
  }
}
