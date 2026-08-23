import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

@Injectable({ providedIn: 'root' })
export class OrientationService {

  async lockLandscape(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      return;
    }

    if (!Capacitor.isPluginAvailable('ScreenOrientation')) {
      return;
    }

    try {
      await ScreenOrientation.lock({
        orientation: 'landscape'
      });
    } catch (err) {
      console.warn(
        '[OrientationService] Não foi possível travar a rotação em landscape',
        err
      );
    }
  }

  async unlock(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      return;
    }

    if (!Capacitor.isPluginAvailable('ScreenOrientation')) {
      return;
    }

    try {
      await ScreenOrientation.unlock();
    } catch (err) {
      console.warn(
        '[OrientationService] Não foi possível destravar a rotação',
        err
      );
    }
  }
}