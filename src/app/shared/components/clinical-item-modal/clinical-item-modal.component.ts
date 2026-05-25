import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController, AlertController, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonFooter } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { Agent, ClinicalEvent, FluidBalance } from 'src/app/core/models/clinical-data.model';

@Component({
  selector: 'app-clinical-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonFooter],
  templateUrl: './clinical-item-modal.component.html',
  styleUrls: ['./clinical-item-modal.component.scss']
})
export class ClinicalItemModalComponent implements OnInit {
  @Input() type!: 'agent' | 'event' | 'balance';
  @Input() itemData?: Agent | ClinicalEvent | FluidBalance;
  
  formData: any = {};
  
  constructor(
    private modalController: ModalController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    if (this.itemData) {
      this.formData = { ...this.itemData };
    } else {
      this.formData.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (this.type === 'agent') {
        this.formData.route = 'IV';
      } else if (this.type === 'balance') {
        this.formData.type = 'gain';
      } else if (this.type === 'event') {
        this.formData.type = 'event';
      }
    }
  }

  cancel() {
    this.modalController.dismiss(null, 'cancel');
  }

  async deleteItem() {
    const itemName = this.formData.name || this.formData.category || 'este registro';
    
    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      subHeader: itemName,
      message: 'Deseja realmente excluir este registro?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.modalController.dismiss({ id: this.itemData?.id }, 'delete');
          }
        }
      ]
    });

    await alert.present();
  }

  confirm() {
    // Basic validation
    if (this.type === 'agent' && !this.formData.name) return;
    if (this.type === 'event' && !this.formData.name) return;
    if (this.type === 'balance' && (!this.formData.category || !this.formData.value)) return;
    
    // For balance, ensure name gets a value
    if (this.type === 'balance') {
      this.formData.name = this.formData.category;
    }
    
    this.modalController.dismiss(this.formData, 'confirm');
  }
}
