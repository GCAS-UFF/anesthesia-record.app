import { Injectable } from "@angular/core";
import { ApiService } from "./base/api.service";
import { BaseService } from "./base/base.service";
import { AnesthesiaRecordModel } from "../../shared/models/anesthesia-record.model";
import { Observable, of } from "rxjs";
import { delay } from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class AnesthesiaRecordService extends BaseService<AnesthesiaRecordModel> {

  constructor(api: ApiService) {
    // Aponta para o controller do backend: /api/AnesthesiaRecord
    super(api, 'AnesthesiaRecord');
  }

  saveRecord(record: any): Observable<any> {
    console.log('Serviço: Salvando ficha via API...', record);
    
    // Se a ficha já possui um ID de persistência, faz PUT, caso contrário POST
    if (record.id) {
      return this.update(record.id, record);
    } else {
      return this.create(record);
    }
  }

  /**
   * [FA-042] Carrega a última ficha de um paciente (se existir)
   */
  getLatestByPatient(pacienteId: string): Observable<AnesthesiaRecordModel | null> {
    const records = this.getStoredRecords();
    const patientRecord = records
      .filter(r => r.pacienteId === pacienteId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0];
    
    return of(patientRecord || null).pipe(delay(100));
  }

  /**
   * [FA-042] Remove todas as fichas de um paciente (usado ao "Limpar" a ficha)
   */
  clearLatestRecord(pacienteId: string): Observable<boolean> {
    console.log('Serviço: Limpando histórico do paciente...', pacienteId);
    let records = this.getStoredRecords();
    records = records.filter(r => r.pacienteId !== pacienteId);
    localStorage.setItem('mock_anesthesia_records', JSON.stringify(records));
    this.clearDraft(pacienteId); // Limpa rascunho também
    return of(true).pipe(delay(100));
  }

  /**
   * [FA-042] Salva um rascunho temporário (Auto-Save)
   */
  saveDraft(pacienteId: string, record: any): void {
    localStorage.setItem(`draft_anesthesia_${pacienteId}`, JSON.stringify({
      ...record,
      pacienteId,
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * [FA-042] Recupera o rascunho temporário
   */
  getDraft(pacienteId: string): any {
    const draft = localStorage.getItem(`draft_anesthesia_${pacienteId}`);
    return draft ? JSON.parse(draft) : null;
  }

  /**
   * [FA-042] Remove o rascunho temporário
   */
  clearDraft(pacienteId: string): void {
    localStorage.removeItem(`draft_anesthesia_${pacienteId}`);
  }

  private getStoredRecords(): AnesthesiaRecordModel[] {
    const data = localStorage.getItem('mock_anesthesia_records');
    return data ? JSON.parse(data) : [];
  }
}