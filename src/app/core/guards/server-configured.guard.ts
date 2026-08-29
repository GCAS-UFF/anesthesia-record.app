import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiUrlService } from '../services/api-url.service';


export const serverConfiguredGuard: CanActivateFn = (_route, state) => {
  const apiUrlService = inject(ApiUrlService);
  const router = inject(Router);

  if (!apiUrlService.hasUrl()) {
    return router.createUrlTree(['/configurar-servidor'], {
      queryParams: { redirect: state.url },
    });
  }

  return true;
};
