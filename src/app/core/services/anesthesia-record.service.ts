import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
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
    
    // Converte o form do Angular (aninhado) para o JSON flat da API
    const apiPayload = this.mapToApiFormat(record);
    
    // Força o ID 9 para testes no backend conforme instrução
    apiPayload.id = 9;
    
    // Sempre faz PUT para /api/AnesthesiaRecord/9 (pois o ID 9 já existe na API)
    return this.update(9, apiPayload);
  }

  /**
   * [FA-042] Carrega a ficha da API e mapeia de volta para o form
   */
  getLatestByPatient(pacienteId: string): Observable<any | null> {
    // Força o ID 9 no GET para teste
    return new Observable(obs => {
      this.getById(9).subscribe({
        next: (apiResponse: any) => {
          if (apiResponse && apiResponse.data) {
            const mappedForm = this.mapToAppFormat(apiResponse.data);
            obs.next(mappedForm);
          } else {
            obs.next(null);
          }
          obs.complete();
        },
        error: () => {
          obs.next(null);
          obs.complete();
        }
      });
    });
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

  getPdfUrl(id: number = 9): string {
    return `${environment.apiUrl}/AnesthesiaRecord/${id}/pdf`;
  }

  // Mapper do App (Aninhado) para a API (Flat)
  private mapToApiFormat(app: any): any {
    return {
      id: 9, // Sempre 9
      patientIdentifiedBeforeInduction: app.seguranca?.identificadoAvaliado === 'sim',
      anestheticConsentSigned: app.seguranca?.consentimentoAssinado === 'sim',
      anesthesiaEquipmentChecked: app.seguranca?.equipamentosChecados === 'sim',
      safetyObservations: app.seguranca?.atencao || '',
      preAnestheticMedication: app.preInducao?.recebeuMedPrevia === 'sim',
      prophylacticAntibioticUsed: app.antibiotico?.temAntibiotico === 'sim',
      bloodPressure: app.dadosVitais?.pa || '',
      respiratoryRate: Number(app.dadosVitais?.fr) || 0,
      temperature: Number(app.dadosVitais?.temp) || 0,
      oxygenSaturation: Number(app.dadosVitais?.spo2) || 0,
      weightKg: Number(app.dadosVitais?.peso) || 0,
      asaClassification: app.dadosVitais?.asa ? parseInt(app.dadosVitais.asa.replace('ASA ', '')) : 1,
      roomEntryTime: app.dadosVitais?.entradaSala || '',
      anesthesiaStartTime: app.equipe?.horaInicioAnestesia || '',
      surgeryEndTime: app.posProcedimento?.horaTerminoCirurgia || '',
      anesthesiaEndTime: app.posProcedimento?.horaTerminoAnestesia || '',
      surgeon: app.equipe?.cirurgiao || '',
      assistant: app.equipe?.assistente || '',
      preOperativeDiagnosis: app.equipe?.diagnosticoPre || '',
      surgicalPosition: 1, // hardcoded Enum
      usesCushions: app.posicao?.usoCoxim === 'sim',
      venousAccessType: 1, // hardcoded Enum
      venousAccessLocation: app.posicao?.localAcesso || '',
      difficultVenousPuncture: app.posicao?.dificuldadePuncao === 'sim',
      generalAnesthesia: app.tecnica?.anestesiaGeral === 'sim',
      respirationMode: 1, // Enum
      controlledVentilationMode: 1, // Enum
      co2AbsorberCircuit: app.tecnica?.circuitoAbsorvedor === 'sim',
      airwayDeviceType: 1, // Enum
      airwayDeviceNumber: "7.5",
      oralTube: app.tecnica?.oral || false,
      nasalTube: app.tecnica?.nasal || false,
      intubationDifficulty: app.tecnica?.dificil ? 2 : 1,
      airwayType: 1, // Enum
      otherAirwayTypeDescription: null,
      laryngoscopy: app.tecnica?.tecLaringoscopia || false,
      retrogradeTechnique: app.tecnica?.tecRetrograda || false,
      videoLaryngoscopy: app.tecnica?.tecVideolaringoscopia || false,
      bronchofibroscopy: app.tecnica?.tecBroncofibroscopia || false,
      tracheostomy: app.tecnica?.tecTraqueostomia || false,
      otherAirwayTechnique: null,
      spinalBlockPerformed: app.tecnica?.bloqueiosEspinhais === 'sim',
      sedationPerformed: app.tecnica?.sedacao === 'sim',
      oxygenSupplementation: app.tecnica?.suplementacaoO2 === 'sim',
      plexusBlockPerformed: app.tecnica?.bloqueioPlexo === 'sim',
      surgeryPerformed: app.posProcedimento?.cirurgiaRealizada || '',
      postOperativeDiagnosis: app.posProcedimento?.diagnosticoPos || '',
      consciousnessScore: Number(app.alderete?.consciencia) || 0,
      activityScore: Number(app.alderete?.atividade) || 0,
      circulationScore: Number(app.alderete?.circulacao) || 0,
      respirationScore: Number(app.alderete?.respiracao) || 0,
      oxygenSaturationScore: Number(app.alderete?.saturacao) || 0,
      totalAldreteKroulikScore: 10,
      clinicalDischargeCondition: 1, // Enum
      destination: 1, // Enum
      hasPain: app.alderete?.dor === 'sim',
      firstAnesthesiologistId: 5,
      firstAnesthesiologistName: "Dra. Amanda Onish",
      secondAnesthesiologistId: 8,
      secondAnesthesiologistName: "Admin Siga"
    };
  }

  // Mapper da API (Flat) para o App (Aninhado)
  private mapToAppFormat(api: any): any {
    return {
      id: api.id,
      pacienteId: 'CIR-001',
      seguranca: {
        identificadoAvaliado: api.patientIdentifiedBeforeInduction ? 'sim' : 'nao',
        consentimentoAssinado: api.anestheticConsentSigned ? 'sim' : 'nao',
        equipamentosChecados: api.anesthesiaEquipmentChecked ? 'sim' : 'nao',
        atencao: api.safetyObservations
      },
      preInducao: {
        recebeuMedPrevia: api.preAnestheticMedication ? 'sim' : 'nao'
      },
      antibiotico: {
        temAntibiotico: api.prophylacticAntibioticUsed ? 'sim' : 'nao'
      },
      dadosVitais: {
        pa: api.bloodPressure,
        fr: api.respiratoryRate?.toString(),
        temp: api.temperature?.toString(),
        spo2: api.oxygenSaturation?.toString(),
        peso: api.weightKg?.toString(),
        asa: 'ASA ' + (api.asaClassification || 'I'),
        entradaSala: api.roomEntryTime
      },
      equipe: {
        cirurgiao: api.surgeon,
        assistente: api.assistant,
        diagnosticoPre: api.preOperativeDiagnosis,
        horaInicioAnestesia: api.anesthesiaStartTime
      },
      posicao: {
        usoCoxim: api.usesCushions ? 'sim' : 'nao',
        localAcesso: api.venousAccessLocation,
        dificuldadePuncao: api.difficultVenousPuncture ? 'sim' : 'nao'
      },
      tecnica: {
        anestesiaGeral: api.generalAnesthesia ? 'sim' : 'nao',
        circuitoAbsorvedor: api.co2AbsorberCircuit ? 'sim' : 'nao',
        oral: api.oralTube,
        nasal: api.nasalTube,
        dificil: api.intubationDifficulty > 1,
        tecLaringoscopia: api.laryngoscopy,
        tecRetrograda: api.retrogradeTechnique,
        tecVideolaringoscopia: api.videoLaryngoscopy,
        tecBroncofibroscopia: api.bronchofibroscopy,
        tecTraqueostomia: api.tracheostomy,
        bloqueiosEspinhais: api.spinalBlockPerformed ? 'sim' : 'nao',
        sedacao: api.sedationPerformed ? 'sim' : 'nao',
        suplementacaoO2: api.oxygenSupplementation ? 'sim' : 'nao',
        bloqueioPlexo: api.plexusBlockPerformed ? 'sim' : 'nao'
      },
      posProcedimento: {
        cirurgiaRealizada: api.surgeryPerformed,
        horaTerminoCirurgia: api.surgeryEndTime,
        diagnosticoPos: api.postOperativeDiagnosis,
        horaTerminoAnestesia: api.anesthesiaEndTime
      },
      alderete: {
        consciencia: api.consciousnessScore?.toString(),
        atividade: api.activityScore?.toString(),
        circulacao: api.circulationScore?.toString(),
        respiracao: api.respirationScore?.toString(),
        saturacao: api.oxygenSaturationScore?.toString(),
        dor: api.hasPain ? 'sim' : 'nao'
      },
      assinaturas: {}
    };
  }
}