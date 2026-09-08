import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor, SystemBars, SystemBarType } from '@capacitor/core';
import { NavigationEnd, Router } from '@angular/router';
import { AnesthesiaRecordService } from './core/services/anesthesia-record.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(
    private anesthesiaRecordService: AnesthesiaRecordService,
    private router: Router,
  ) {
  }

  ngOnInit(): void {
    this.anesthesiaRecordService.startAutoSync();

    if (Capacitor.isNativePlatform()) {
      this.hideStatusBar();

      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.hideStatusBar();
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.hideStatusBar();
        }
      });
    }
  }

  private hideStatusBar(): void {
    SystemBars.hide({ bar: SystemBarType.StatusBar });
  }
}
