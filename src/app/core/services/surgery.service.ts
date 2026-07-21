import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PatientResponse } from '../../shared/models/patient.model';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SurgeryStatusEnum } from '../models/api-enums.model';

@Injectable({
  providedIn: 'root'
})
export class SurgeryService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }


  getSurgeries(doctorId: number, date?: string, searchQuery?: string, status?: SurgeryStatusEnum, page: number = 1, size: number = 10): Observable<PatientResponse> {
    const url = `${this.baseUrl}/surgeries/${doctorId}`;

    const params: any = { page, size};
    if (date) 
      params.date = `${date}T00:00:00Z`;
    if (searchQuery) 
      params.term = searchQuery;
    if (status !== undefined) 
      params.status = status;

    return this.http.get<PatientResponse>(url, { params });
  }

  getPatientDate(id: number, patientId: string): Observable<any> {
    const url = `${this.baseUrl}/anesthesiarecord/${id}/${patientId}`;
    return this.http.get<any>(url);
  }

  getMyPatients(doctorId: number, date?: string, searchQuery?: string, status?: SurgeryStatusEnum | null, page: number = 1, size: number = 10): Observable<PatientResponse> {

    let params = new HttpParams()
      .set('doctorId', doctorId)
      .set('page', page)
      .set('pageSize', size);

    if (date) {
      params = params.set('date', date);
    }

    if (searchQuery) {
      params = params.set('term', searchQuery);
    }

    if (status !== null && status !== undefined) {
      params = params.set('status', status);
    }

    return this.http.get<PatientResponse>(
      `${this.baseUrl}/anesthesiarecord/my-patients`,
      { params }
    );
  }

  assumePatient(patientId: string, surgeryId: number, responsableId: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/surgeries/${patientId}/${surgeryId}/${responsableId}`, {});
  }
}