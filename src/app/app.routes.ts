import { Routes } from '@angular/router';

/**
 * Rotas principais da aplicação.
 *
 * - '/' (default): Tabs
 * - '/login': Página de login (standalone, lazy)
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
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
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
