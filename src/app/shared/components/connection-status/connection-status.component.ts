import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

/**
 * FA-028 - Status de conexão reutilizável
 * Exibe se está online ou offline.
 */
@Component({
  selector: 'app-connection-status',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './connection-status.component.html',
  styleUrls: ['./connection-status.component.scss']
})
export class ConnectionStatusComponent implements OnInit, OnDestroy {
  online = navigator.onLine;
  private onlineHandler = () => this.online = true;
  private offlineHandler = () => this.online = false;

  ngOnInit() {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }
  ngOnDestroy() {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }
}
