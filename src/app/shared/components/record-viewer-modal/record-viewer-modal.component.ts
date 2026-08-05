import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

export interface RecordSection {
  title: string;
  fields: { label: string; value: string | number | null }[];
}

export interface RecordData {
  title: string;
  sections: RecordSection[];
}

@Component({
  selector: 'app-record-viewer-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './record-viewer-modal.component.html',
  styleUrls: ['./record-viewer-modal.component.scss'],
})
export class RecordViewerModalComponent {
  @Input() data: RecordData | null = null;

  constructor(private modalCtrl: ModalController) {}

  close() {
    this.modalCtrl.dismiss();
  }
}
