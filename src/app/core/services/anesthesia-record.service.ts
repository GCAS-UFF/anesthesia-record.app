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
    super(api, 'anesthesia-records');
  }

  /**
   * [FA-042] Salva a ficha anestésica. 
   * Por enquanto usa Mock, mas está preparado para o backend.
   */
  saveRecord(record: AnesthesiaRecordModel): Observable<AnesthesiaRecordModel> {
    console.log('Serviço: Salvando ficha...', record);
    // Mock: salva no localStorage para persistência local durante testes
    const records = this.getStoredRecords();
    const newRecord = { 
      ...record, 
      id: record.id || Math.floor(Math.random() * 10000),
      createdAt: new Date().toISOString()
    };
    
    records.push(newRecord);
    localStorage.setItem('mock_anesthesia_records', JSON.stringify(records));
    
    return of(newRecord).pipe(delay(100)); // Simula latência de rede reduzida
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