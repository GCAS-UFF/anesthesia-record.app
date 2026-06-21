import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PatientResponse } from '../../shared/models/patient.model';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SurgeryService {
  private baseUrl = environment.apiUrl.replace(/\/api$/, '');

  constructor(private http: HttpClient) { }

  /**
   * Obtém a lista de pacientes com cirurgias filtrada por data e status.
   */
  getSurgeries(date?: string, status?: string, page: number = 1, size: number = 10): Observable<PatientResponse> {
    const url = `${this.baseUrl}/surgeries`;

    const params: any = { page, size };
    if (date) params.date = `${date}T00:00:00Z`;
    if (status && status !== 'all') params.status = status;

    return this.http.get<PatientResponse>(url, { params });
  }

  /**
   * Associa um médico responsável ao paciente/cirurgia
   */
  assumePatient(patientId: string, surgeryId: number, responsableId: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/surgeries/${patientId}/${surgeryId}/${responsableId}`, {});
  }
}
