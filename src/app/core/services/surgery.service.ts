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
    const url = 'surgeries';
    
    const params: any = { page, size };
    if (date) params.date = `${date}T00:00:00Z`;
    if (status && status !== 'all') params.status = status;

    return this.api.get<PatientResponse>(url, params);
  }

  /**
   * Associa um médico responsável ao paciente/cirurgia
   */
  assumePatient(patientId: string, responsableId: number): Observable<any> {
    return this.api.patch(`surgeries/${patientId}/${responsableId}`, {});
  }
}
