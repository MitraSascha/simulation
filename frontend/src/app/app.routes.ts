import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'simulations', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(c => c.LoginComponent),
  },
  {
    path: 'simulations',
    canActivate: [authGuard],
    loadComponent: () => import('./features/simulation-list/simulation-list.component').then(c => c.SimulationListComponent),
  },
  {
    path: 'simulations/create',
    canActivate: [authGuard],
    loadComponent: () => import('./features/simulation-create/simulation-create.component').then(c => c.SimulationCreateComponent),
  },
  {
    path: 'simulation/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/simulation-dashboard/simulation-dashboard.component').then(c => c.SimulationDashboardComponent),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', loadComponent: () => import('./features/simulation-dashboard/overview/overview.component').then(c => c.OverviewComponent) },
      { path: 'network', loadComponent: () => import('./features/simulation-dashboard/network/network.component').then(c => c.NetworkComponent) },
      { path: 'influence', loadComponent: () => import('./features/simulation-dashboard/influence/influence.component').then(c => c.InfluenceComponent) },
      { path: 'sentiment', loadComponent: () => import('./features/simulation-dashboard/sentiment/sentiment.component').then(c => c.SentimentComponent) },
      { path: 'personas', loadComponent: () => import('./features/simulation-dashboard/personas/personas.component').then(c => c.PersonasComponent) },
      { path: 'report', loadComponent: () => import('./features/simulation-dashboard/report/report.component').then(c => c.ReportComponent) },
    ],
  },
  { path: '**', redirectTo: 'simulations' },
];
