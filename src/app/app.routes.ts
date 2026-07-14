import { Routes } from '@angular/router';

/**
 * Rotas principais da aplicação.
 *
 * - '/login': Página de login (standalone, lazy)
 * - '/pacientes': Listagem operacional de pacientes
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.routes').then(m => m.LOGIN_ROUTES)
  },
  {
    path: 'pacientes',
    loadComponent: () => import('./features/patient-list/patient-list.page').then(m => m.PatientListPage)
  },
  {
    path: 'ficha-anestesica/:id/:patientId',
    loadComponent: () => import('./features/ficha-anestesica/ficha-anestesica.component').then(m => m.FichaAnestesicaComponent)
  },
  {
    path: 'monitorizacao/:id',
    loadComponent: () => import('./features/monitorizacao/monitorizacao.component').then(m => m.MonitorizacaoComponent)
  },
  {
    path: 'registro-cirurgia/:id',
    loadComponent: () => import('./features/registro-cirurgia/registro-cirurgia.component').then(m => m.RegistroCirurgiaComponent)
  },
  {
    path: 'meus-pacientes/:id',
    loadComponent: () => import('./features/my-patient/my-patients.page').then(m => m.MyPatientsPage)
  },
  {
    path: 'integracoes',
    loadComponent: () => import('./features/aghu-integration/aghu-integration.page').then(m => m.AghuIntegrationPage)
  }
];
