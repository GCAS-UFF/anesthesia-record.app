import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
  }

  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrlService.getBaseUrl()}/health`);
  }

  /** Testa um endereço ainda não salvo (usado na tela de configuração do servidor). */
  checkHealthAt(rawUrl: string): Observable<any> {
    return this.http.get(ApiUrlService.healthUrlFor(rawUrl));
  }
}
