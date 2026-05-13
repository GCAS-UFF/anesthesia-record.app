import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, 
  documentTextOutline, 
  settingsOutline, 
  pulseOutline, 
  warningOutline, 
  listOutline, 
  addOutline, 
  trashOutline, 
  medkitOutline, 
  cutOutline, 
  flaskOutline, 
  bookmarkOutline, 
  waterOutline, 
  checkmarkDoneCircleOutline 
} from 'ionicons/icons';

// Shared Components
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';

// Services
import { SurgeryService } from 'src/app/core/services/surgery.service';

@Component({
  selector: 'app-monitorizacao',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    StatusBarComponent,
    HeaderInstitucionalComponent
  ],
  templateUrl: './monitorizacao.component.html',
  styleUrls: ['./monitorizacao.component.scss']
})
export class MonitorizacaoComponent implements OnInit {
  pacienteId: string | null = null;
  patient: any = null;
  selectedSurgery: any = null;
  selectedProcedure: any = null;
  isLoading = true;
  hasData = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private surgeryService: SurgeryService,
    private location: Location
  ) {
    addIcons({
      arrowBackOutline,
      documentTextOutline,
      settingsOutline,
      pulseOutline,
      warningOutline,
      listOutline,
      addOutline,
      trashOutline,
      medkitOutline,
      cutOutline,
      flaskOutline,
      bookmarkOutline,
      waterOutline,
      checkmarkDoneCircleOutline
    });
  }

  ngOnInit() {
    this.pacienteId = this.route.snapshot.paramMap.get('id');
    if (this.pacienteId) {
      this.loadPatientData(this.pacienteId);
    }
  }

  private loadPatientData(id: string) {
    this.isLoading = true;
    // Buscando dados reais do paciente para o header
    this.surgeryService.getSurgeries('2026-04-21').subscribe(res => {
      const patientData = res.data.find(p => p.surgeries.some(s => s.id === parseInt(id)));
      if (patientData) {
        this.patient = {
          ...patientData,
          gender: patientData.gender || 'M',
          birthDate: this.formatDate(patientData.birthDate || '1985-03-15T00:00:00')
        };
        this.selectedSurgery = patientData.surgeries.find(s => s.id === parseInt(id));
        this.selectedProcedure = this.selectedSurgery.procedures.find((p: any) => p.isPrimary) || this.selectedSurgery.procedures[0];
      }
      this.isLoading = false;
    });
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  voltar() {
    this.location.back();
  }

  abrirFicha() {
    this.router.navigate(['/ficha-anestesica', this.pacienteId]);
  }
}
