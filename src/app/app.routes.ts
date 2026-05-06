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
    path: 'ficha-anestesica/:id',
    loadComponent: () => import('./features/ficha-anestesica/ficha-anestesica.component').then(m => m.FichaAnestesicaComponent)
  },
  {
    path: 'registro-cirurgia/:id',
    loadComponent: () => import('./features/registro-cirurgia/registro-cirurgia.component').then(m => m.RegistroCirurgiaComponent)
  }
];
