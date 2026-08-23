import { Injectable } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { LoginCredentials } from './login.model';
import { Observable } from 'rxjs';


@Injectable()
export class LoginFacade {
  constructor(private authService: AuthService) {}


  login(credentials: LoginCredentials): Observable<boolean> {
    return this.authService.login(credentials);
  }
}
