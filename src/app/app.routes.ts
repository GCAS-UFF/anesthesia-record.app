import { Routes } from '@angular/router';

/**
 * Rotas principais da aplicação.
 *
 * - '/' (default): Tabs
 * - '/login': Página de login (standalone, lazy)
 */
export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.routes').then(m => m.LOGIN_ROUTES)
  },
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
];
