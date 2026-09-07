import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor, SystemBars, SystemBarType } from '@capacitor/core';
import { AnesthesiaRecordService } from './core/services/anesthesia-record.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(private anesthesiaRecordService: AnesthesiaRecordService) {
  }

  ngOnInit(): void {
    this.anesthesiaRecordService.startAutoSync();

    if (Capacitor.isNativePlatform()) {
      SystemBars.hide({ bar: SystemBarType.StatusBar });
    }
  }
}
