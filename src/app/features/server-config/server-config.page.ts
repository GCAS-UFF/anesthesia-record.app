import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  serverOutline,
  linkOutline,
  refreshOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
} from 'ionicons/icons';

import { environment } from 'src/environments/environment';
import { HealthService } from '../../core/services/health.service';
import { ApiUrlService } from '../../core/services/api-url.service';

type ConnectionState = 'idle' | 'testing' | 'success' | 'error';

@Component({
  selector: 'app-server-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonIcon, IonSpinner],
  templateUrl: './server-config.page.html',
  styleUrls: ['./server-config.page.scss'],
})
export class ServerConfigPage implements OnInit {
  form!: FormGroup;
  state: ConnectionState = 'idle';
  isReconfiguring = false;

  private redirectTo = '/login';

  constructor(
    private fb: FormBuilder,
    private healthService: HealthService,
    private apiUrlService: ApiUrlService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    addIcons({
      serverOutline,
      linkOutline,
      refreshOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
    });
  }

  ngOnInit(): void {
    const existing = this.apiUrlService.getRawUrl();
    this.isReconfiguring = !!existing;

    const redirectParam = this.route.snapshot.queryParamMap.get('redirect');
    if (redirectParam) {
      this.redirectTo = redirectParam;
    }

    this.form = this.fb.group({
      serverUrl: [existing ?? this.suggestedDefault(), [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    });
  }

  get canCancel(): boolean {
    return this.isReconfiguring;
  }

  testarConexao(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value.serverUrl as string;
    this.state = 'testing';

    this.healthService
      .checkHealthAt(raw)
      .pipe(catchError(() => of(null)))
      .subscribe(response => {
        if (response) {
          this.apiUrlService.setUrl(raw);
          this.state = 'success';
        } else {
          this.state = 'error';
        }
      });
  }

  tentarNovamente(): void {
    this.state = 'idle';
  }

  continuar(): void {
    this.router.navigateByUrl(this.redirectTo, { replaceUrl: !this.isReconfiguring });
  }

  cancelar(): void {
    this.router.navigateByUrl(this.redirectTo);
  }

  private suggestedDefault(): string {
    if (environment.production) {
      return '';
    }
    return environment.apiUrl.replace(/\/api\/?$/, '');
  }
}
