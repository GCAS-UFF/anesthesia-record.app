import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MonitoringPayload } from '../models/monitoring-payload.model';

@Injectable({
  providedIn: 'root'
})
export class MonitoringService {
  
  // No futuro, teremos aqui HttpClient e environment.apiUrl
  // constructor(private http: HttpClient) {}

  /**
   * Busca os dados de monitorização salvos previamente para uma cirurgia
   */
  getMonitoringData(surgeryId: number): Observable<MonitoringPayload | null> {
    console.log(`[MonitoringService] Buscando dados de monitorização da cirurgia ${surgeryId}...`);
    // Mock simulando que não há dados ainda
    return of(null).pipe(delay(800)); 
  }

  /**
   * Salva os dados de monitorização (auto-save ou encerramento)
   */
  saveMonitoringData(surgeryId: number, data: MonitoringPayload): Observable<{ success: boolean, message: string }> {
    console.log(`[MonitoringService] Salvando dados de monitorização da cirurgia ${surgeryId}...`, data);
    // Mock simulando sucesso
    return of({ success: true, message: 'Dados de monitorização salvos com sucesso.' }).pipe(delay(1000));
  }
}
