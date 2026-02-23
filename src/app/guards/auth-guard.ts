import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, tap } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isLoggedIn$.pipe(
    // Si no está autenticado, redirigir al login
    tap((isAuthenticated) => {
      if (!isAuthenticated) {
        console.log('🚫 Acceso denegado - Usuario no autenticado');
        router.navigate(['/auth']);
      } else {
        console.log('✅ Acceso permitido - Usuario autenticado');
      }
    }),
    // Retornar el estado de autenticación
    map((isAuthenticated) => isAuthenticated),
  );
};
