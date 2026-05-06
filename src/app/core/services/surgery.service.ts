import { Injectable } from '@angular/core';
import { ApiService } from './base/api.service';
import { PatientResponse } from '../../shared/models/patient.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SurgeryService {
  constructor(private api: ApiService) {}

  /**
   * Obtém a lista de pacientes com cirurgias filtrada por data e status.
   */
  getSurgeries(date?: string, status?: string, page: number = 1, size: number = 10): Observable<PatientResponse> {
    let url = 'api/surgeries';
    
    if (date && status && status !== 'all') {
      url = `api/surgeries/date/${date}/status/${status}`;
    } else if (date) {
      url = `api/surgeries/date/${date}`;
    } else if (status && status !== 'all') {
      url = `api/surgeries/status/${status}`;
    }

    return this.api.get<PatientResponse>(url, { page, size });
  }
}
