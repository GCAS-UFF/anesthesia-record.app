import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideAppInitializer, inject } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { LanguageService, DEFAULT_LANGUAGE } from './app/core/services/language.service';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTranslateService({
      lang: DEFAULT_LANGUAGE,
      fallbackLang: DEFAULT_LANGUAGE,
    }),
    provideTranslateHttpLoader({
      resources: [
        { prefix: '/assets/i18n/', suffix: '.json' },
        { prefix: '/assets/i18n/ficha-anestesica/', suffix: '.json' },
        { prefix: '/assets/i18n/pre-anesthesic-record/', suffix: '.json' },
        { prefix: '/assets/i18n/monitorizacao/', suffix: '.json' },
        { prefix: '/assets/i18n/relatorios/', suffix: '.json' },
        { prefix: '/assets/i18n/patients/', suffix: '.json' },
        { prefix: '/assets/i18n/admin/', suffix: '.json' },
        { prefix: '/assets/i18n/shared/', suffix: '.json' },
      ],
    }),
    provideAppInitializer(() => inject(LanguageService).init()),
  ],
});
