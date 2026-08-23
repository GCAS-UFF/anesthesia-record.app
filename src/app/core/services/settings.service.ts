import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './base/api.service';
import {
  ChangeAdminPasswordCommand,
  InstitutionSettingsCommand,
  UserSettingsCommand,
  UserSettingsDto,
} from '../../shared/models/settings.model';

const SETTINGS_ENDPOINT = 'UserSettings';

interface CommandResult<T> {
  valid: boolean;
  data: T;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  constructor(private api: ApiService) {}

  get(): Observable<UserSettingsDto> {
    return this.api
      .get<CommandResult<UserSettingsDto>>(SETTINGS_ENDPOINT)
      .pipe(map((res) => res.data));
  }

  updateUserSettings(command: UserSettingsCommand): Observable<UserSettingsDto> {
    return this.api
      .put<CommandResult<UserSettingsDto>>(SETTINGS_ENDPOINT, command)
      .pipe(map((res) => res.data));
  }

  updateInstitutionSettings(command: InstitutionSettingsCommand): Observable<UserSettingsDto> {
    return this.api
      .put<CommandResult<UserSettingsDto>>(`${SETTINGS_ENDPOINT}/institution`, command)
      .pipe(map((res) => res.data));
  }

  changeAdminPassword(command: ChangeAdminPasswordCommand): Observable<void> {
    return this.api
      .put<CommandResult<void>>(`${SETTINGS_ENDPOINT}/admin-password`, command)
      .pipe(map(() => undefined));
  }
}
