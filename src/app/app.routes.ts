import { Routes } from '@angular/router';

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
    path: 'meus-pacientes/:id',
    loadComponent: () => import('./features/my-patient/my-patients.page').then(m => m.MyPatientsPage)
  },
  {
    path: 'admin/integracoes',
    loadComponent: () => import('./features/aghu-integration/aghu-integration.page').then(m => m.AghuIntegrationPage)
  },
  {   
    path: 'pre-anesthesia-record/:id/:patientId',
    loadComponent: () => import('./features/pre-anesthesic-record/pre-anesthesic-record.component').then(m => m.FichaPreAnestesicaComponent)
  }
];
