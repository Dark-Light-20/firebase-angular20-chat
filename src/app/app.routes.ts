import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadComponent: () => import('./components/auth/auth').then((m) => m.Auth),
    title: 'Iniciar sesión - Chat Asistente',
  },
  {
    path: 'chat',
    loadComponent: () => import('./components/chat/chat').then((m) => m.Chat),
    title: 'Chat - Chat Asistente',
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '/auth',
  },
];
