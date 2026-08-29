import { TestBed } from '@angular/core/testing';
import { ApiUrlService } from './api-url.service';

const STORAGE_KEY = 'siga_api_url';

describe('ApiUrlService', () => {
  let service: ApiUrlService;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiUrlService);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('reports no url configured when localStorage is empty', () => {
    expect(service.hasUrl()).toBeFalse();
    expect(service.getRawUrl()).toBeNull();
    expect(service.getBaseUrl()).toBe('');
  });

  it('normalizes trailing slashes and surrounding whitespace when saving', () => {
    service.setUrl('  http://192.168.1.50:5000/  ');

    expect(service.getRawUrl()).toBe('http://192.168.1.50:5000');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('http://192.168.1.50:5000');
  });

  it('builds the base url used by all services by appending /api', () => {
    service.setUrl('http://192.168.1.50:5000');

    expect(service.getBaseUrl()).toBe('http://192.168.1.50:5000/api');
  });

  it('persists across service instances (simulating an app restart)', () => {
    service.setUrl('https://siga-api.hospital.local');

    const restarted = TestBed.inject(ApiUrlService);
    expect(restarted.getRawUrl()).toBe('https://siga-api.hospital.local');
  });

  it('emits the updated url through url$', () => {
    const values: (string | null)[] = [];
    service.url$.subscribe(v => values.push(v));

    service.setUrl('http://10.0.0.5:8080');

    expect(values).toEqual([null, 'http://10.0.0.5:8080']);
  });

  it('clears the stored url', () => {
    service.setUrl('http://10.0.0.5:8080');
    service.clearUrl();

    expect(service.hasUrl()).toBeFalse();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  describe('healthUrlFor', () => {
    it('builds the /api/health url for a candidate address not yet saved', () => {
      expect(ApiUrlService.healthUrlFor('http://192.168.1.50:5000')).toBe(
        'http://192.168.1.50:5000/api/health',
      );
    });

    it('normalizes the candidate address before building the health url', () => {
      expect(ApiUrlService.healthUrlFor('  http://192.168.1.50:5000/  ')).toBe(
        'http://192.168.1.50:5000/api/health',
      );
    });
  });
});
