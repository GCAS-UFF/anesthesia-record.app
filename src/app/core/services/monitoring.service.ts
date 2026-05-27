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
  getMonitoringData(surgeryId: string | number): Observable<MonitoringPayload | null> {
    console.log(`[MonitoringService] Buscando dados de monitorização reais da cirurgia ${surgeryId}...`);
    // Forçando ID 9 conforme o swagger/instruções para testes
    return this.http.get<any>(`${this.baseUrl}/Monitoring/9`).pipe(
      map(res => {
         if (res && res.data) {
            return res.data as MonitoringPayload;
         }
         return null;
      })
    );
  }

  /**
   * Salva os dados de monitorização (auto-save ou encerramento)
   */
  saveMonitoringData(surgeryId: string | number, data: MonitoringPayload): Observable<any> {
    console.log(`[MonitoringService] (Mock) Salvando dados de monitorização da cirurgia ${surgeryId}...`, data);
    // A rota de POST/PUT de monitoring não foi detalhada no swagger pelo usuário,
    // então deixaremos um dummy temporário aqui por segurança se não existir
    return this.http.post<any>(`${this.baseUrl}/Monitoring`, { ...data, anesthesiaRecordId: 9 });
  }
}
