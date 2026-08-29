import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { SettingComponent } from './settings.component';
import { UserSettingsDto } from '../../shared/models/settings.model';

describe('SettingComponent', () => {
  let component: SettingComponent;
  let settingsServiceSpy: jasmine.SpyObj<any>;
  let apiUrlServiceSpy: jasmine.SpyObj<any>;
  let healthServiceSpy: jasmine.SpyObj<any>;
  let authServiceSpy: jasmine.SpyObj<any>;
  let toastSpy: jasmine.SpyObj<any>;

  const dtoWithInstitution = (aghuApiUrl: string | null): UserSettingsDto => ({
    isAdmin: true,
    language: 'pt-BR',
    monitoringIntervalMinutes: 5,
    useInstitutionalInterval: true,
    institutionalMonitoringIntervalMinutes: 5,
    institution: {
      monitoringIntervalMinutes: 5,
      sigaApiUrl: null,
      aghuApiUrl,
      hospitalName: 'Hospital Universitário Antônio Pedro',
      hospitalSector: 'Centro Cirúrgico',
      hospitalCnpj: null,
      hospitalCep: null,
      hospitalStreet: null,
      hospitalNumber: null,
      hospitalNeighborhood: null,
      hospitalCity: 'Niterói',
      hospitalState: 'RJ',
    },
  });

  beforeEach(() => {
    settingsServiceSpy = jasmine.createSpyObj('SettingsService', [
      'get',
      'updateUserSettings',
      'updateInstitutionSettings',
      'changeAdminPassword',
      'testAghuConnection',
    ]);
    apiUrlServiceSpy = jasmine.createSpyObj('ApiUrlService', ['getRawUrl', 'setUrl']);
    healthServiceSpy = jasmine.createSpyObj('HealthService', ['checkHealth', 'checkHealthAt']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin', 'getUser']);
    toastSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastSpy.create.and.resolveTo({ present: () => Promise.resolve() } as any);

    apiUrlServiceSpy.getRawUrl.and.returnValue('http://192.168.1.50:5000');
    authServiceSpy.isAdmin.and.returnValue(true);
    authServiceSpy.getUser.and.returnValue({
      username: 'admin', name: 'Admin', id: 1, sector: 'Admin', role: 'Admin', isAdmin: true, email: 'admin@teste.com',
    });
    healthServiceSpy.checkHealth.and.returnValue(of({ data: { database: true, aghu: false } }));
    settingsServiceSpy.get.and.returnValue(of(dtoWithInstitution('http://aghu.hospital.local')));

    component = new SettingComponent(
      new FormBuilder(),
      toastSpy,
      authServiceSpy,
      settingsServiceSpy,
      apiUrlServiceSpy,
      healthServiceSpy,
      { detectChanges: () => undefined } as any,
    );

    component.ngOnInit();
  });

  it('sources the SIGA URL from the device-local ApiUrlService, not from the backend DTO', () => {
    expect(component.sigaUrl).toBe('http://192.168.1.50:5000');
    expect(component.aghuUrl).toBe('http://aghu.hospital.local');
  });

  it('does not persist the AGHU URL when the connection test fails, keeping the previous configuration', async () => {
    settingsServiceSpy.testAghuConnection.and.returnValue(of({ connected: false }));
    component.aghuUrl = 'http://novo-aghu-offline.local';

    await component.testarConexao('aghu');

    expect(component.testing.aghu).toBe('fail');
    expect(settingsServiceSpy.updateInstitutionSettings).not.toHaveBeenCalled();
  });

  it('persists the AGHU URL merged with the existing institution fields when the connection test succeeds', async () => {
    settingsServiceSpy.testAghuConnection.and.returnValue(of({ connected: true }));
    settingsServiceSpy.updateInstitutionSettings.and.returnValue(of(dtoWithInstitution('http://novo-aghu.hospital.local')));
    component.aghuUrl = 'http://novo-aghu.hospital.local';

    await component.testarConexao('aghu');

    expect(component.testing.aghu).toBe('ok');
    const sentCommand = settingsServiceSpy.updateInstitutionSettings.calls.mostRecent().args[0];
    expect(sentCommand.aghuApiUrl).toBe('http://novo-aghu.hospital.local');
    expect(sentCommand.hospitalName).toBe('Hospital Universitário Antônio Pedro'); // preserved, not wiped
  });

  it('does not touch the backend when testing the SIGA connection, only device-local storage', async () => {
    healthServiceSpy.checkHealthAt.and.returnValue(of({ valid: true }));
    component.sigaUrl = 'http://novo-siga.hospital.local';

    await component.testarConexao('siga');

    expect(component.testing.siga).toBe('ok');
    expect(apiUrlServiceSpy.setUrl).toHaveBeenCalledWith('http://novo-siga.hospital.local');
    expect(settingsServiceSpy.updateInstitutionSettings).not.toHaveBeenCalled();
  });

  it('marks the SIGA connection as failed and does not save when the health check errors out', async () => {
    healthServiceSpy.checkHealthAt.and.returnValue(throwError(() => new Error('network error')));
    component.sigaUrl = 'http://servidor-invalido.local';

    await component.testarConexao('siga');

    expect(component.testing.siga).toBe('fail');
    expect(apiUrlServiceSpy.setUrl).not.toHaveBeenCalled();
  });

  it('reflects /health data on the status getters before any manual test has run', () => {
    expect(component.sigaStatusLabel).toBe('ok'); // data.database === true
    expect(component.aghuStatusLabel).toBe('fail'); // data.aghu === false
  });

  it('exposes the admin account info from AuthService for the Conta ADMIN card', () => {
    expect(component.adminAccount).toEqual(jasmine.objectContaining({
      name: 'Admin',
      username: 'admin',
      email: 'admin@teste.com',
    }));
  });
});
