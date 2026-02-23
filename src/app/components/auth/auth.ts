import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-auth',
  imports: [],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  isLoggingIn = false;
  errorMessage = '';

  async loginWithGoogle(): Promise<void> {
    this.errorMessage = '';
    this.isLoggingIn = true;

    try {
      // const user = await this.authService.loginWithGoogle();

      // Simulación de llamada al servicio de autenticación (reemplazar con la línea anterior en producción)
      let user = null;
      user = await new Promise((resolve) => {
        setTimeout(() => resolve({ name: 'Usuario de Prueba' }), 1000);
      });

      if (user) {
        await this.router.navigate(['/chat']);
      } else {
        this.errorMessage = 'No se pudo obtener la información del usuario';
        console.error('❌ No se obtuvo información del usuario');
      }
    } catch (error: any) {
      console.error('❌ Error durante la autenticación:', error);

      if (error.code === 'auth/popup-closed-by-user') {
        this.errorMessage = 'Has cerrado la ventana de autenticación. Intenta de nuevo.';
      } else if (error.code === 'auth/popup-blocked') {
        this.errorMessage =
          'Tu navegador bloqueó la ventana de autenticación. Permite popups y vuelve a intentar.';
      } else if (error.code === 'auth/network-request-failed') {
        this.errorMessage = 'Error de conexión. Verifica tu internet y vuelve a intentar.';
      } else {
        this.errorMessage = 'Error al iniciar sesión. Por favor intenta de nuevo.';
      }
    } finally {
      this.isLoggingIn = false;
    }
  }

  ngOnInit(): void {
    // this.authService.isLoggedIn$.subscribe(isLoggedIn => {
    //   if (isLoggedIn) {
    //     this.router.navigate(['/chat']);
    //   }
    // });
  }
}
