import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  wifiOutline,
  cloudOutline,
  cloudUploadOutline,
  syncOutline,
} from 'ionicons/icons';
import { catchError, interval, of, startWith, Subscription, switchMap } from 'rxjs';
import { HealthService } from 'src/app/core/services/health.service';
import { SyncStatus } from 'src/app/core/enums/sync-statut.enum';
import { AnesthesiaRecordService } from 'src/app/core/services/anesthesia-record.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.scss']
})
export class StatusBarComponent implements OnInit, OnDestroy {
  timeStr = '';
  dateStr = '';
  private timer: any;

  serverConnected = false;
  aghuConnected = false;

  SyncStatus = SyncStatus;
  syncStatus: SyncStatus = SyncStatus.Synced;
  pendingDrafts = 0;

  private healthSubscription?: Subscription;
  private draftSubscription?: Subscription;

  constructor(
    private healthService: HealthService,
    private anesthesiaRecordService: AnesthesiaRecordService,
  ) {
    addIcons({
      wifiOutline,
      cloudOutline,
      cloudUploadOutline,
      syncOutline,
    });
  }

  ngOnInit() {
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 1000);

    this.draftSubscription =
      this.anesthesiaRecordService.pendingDraftsCount$
        .subscribe(count => {
          this.pendingDrafts = count;

          if (this.syncStatus === SyncStatus.Syncing) {
            return;
          }

          this.syncStatus =
            count > 0
              ? SyncStatus.Pending
              : SyncStatus.Synced;
        });

    this.startHealthCheck();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.healthSubscription?.unsubscribe();
    this.draftSubscription?.unsubscribe();
  }

  private updateClock() {
    const now = new Date();
    this.timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let dateStrRaw = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    this.dateStr = dateStrRaw.charAt(0).toUpperCase() + dateStrRaw.slice(1);
  }

  private startHealthCheck(): void {
    this.healthSubscription = interval(60000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.healthService.checkHealth().pipe(
            catchError(() => of(null))
          )
        )
      )
      .subscribe(response => {
        if (!response?.data) {
          this.serverConnected = false;
          this.aghuConnected = false;
          return;
        }

        this.serverConnected = response.data.database;
        this.aghuConnected = response.data.aghu;

        this.anesthesiaRecordService.setServerStatus(
          response.data.database && response.data.aghu
        );
      });
  }
}
