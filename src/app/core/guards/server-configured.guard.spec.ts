import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { serverConfiguredGuard } from './server-configured.guard';
import { ApiUrlService } from '../services/api-url.service';

describe('serverConfiguredGuard', () => {
  let apiUrlService: ApiUrlService;
  let router: Router;

  beforeEach(() => {
    localStorage.removeItem('siga_api_url');
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    apiUrlService = TestBed.inject(ApiUrlService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.removeItem('siga_api_url');
  });

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() =>
      serverConfiguredGuard({} as any, { url } as any),
    );
  }

  it('redirects to /configurar-servidor when no server url is saved', () => {
    const result = runGuard('/pacientes') as UrlTree;

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toContain('/configurar-servidor');
  });

  it('preserves the originally requested url as the redirect query param', () => {
    const result = runGuard('/pacientes') as UrlTree;

    expect(router.serializeUrl(result)).toContain('redirect=%2Fpacientes');
  });

  it('allows activation when a server url is already saved', () => {
    apiUrlService.setUrl('http://192.168.1.50:5000');

    const result = runGuard('/pacientes');

    expect(result).toBeTrue();
  });
});
