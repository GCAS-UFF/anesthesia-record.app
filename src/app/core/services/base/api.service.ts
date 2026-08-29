import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ApiUrlService } from "../api-url.service";

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private get baseUrl(): string {
    return this.apiUrlService.getBaseUrl();
  }

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {}

  get<T>(url: string, params?: any) {
    return this.http.get<T>(`${this.baseUrl}/${url}`, { params });
  }

  post<T>(url: string, body: any) {
    return this.http.post<T>(`${this.baseUrl}/${url}`, body);
  }

  put<T>(url: string, body: any) {
    return this.http.put<T>(`${this.baseUrl}/${url}`, body);
  }

  patch<T>(url: string, body: any) {
    return this.http.patch<T>(`${this.baseUrl}/${url}`, body);
  }

  delete<T>(url: string) {
    return this.http.delete<T>(`${this.baseUrl}/${url}`);
  }
}