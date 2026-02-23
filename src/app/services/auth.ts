import { Injectable, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user } from '@angular/fire/auth';
import { map } from 'rxjs/operators';
import { User } from '../models/user';
import { userMapper } from '../utils/mappers/user.mapper';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);

  // Creamos un Observable que nos permite saber si hay un usuario autenticado
  // Este Observable emite cada vez que cambia el estado de autenticación
  user$ = user(this.auth).pipe(
    map((firebaseUser) => (firebaseUser ? userMapper(firebaseUser) : null)),
  );

  // Observable que nos dice si el usuario está autenticado o no
  isLoggedIn$ = this.user$.pipe(
    // Transformamos el usuario en un boolean: true si existe, false si no
    map((user) => !!user),
  );

  async loginWithGoogle(): Promise<User | null> {
    try {
      // Creamos el proveedor de Google para la autenticación
      const provider = new GoogleAuthProvider();

      // Configuramos los scopes que queremos obtener del usuario
      provider.addScope('email');
      provider.addScope('profile');

      // Abrimos el popup de Google para autenticación
      const result = await signInWithPopup(this.auth, provider);

      const firebaseUser = result.user;

      if (firebaseUser) {
        const user = userMapper(firebaseUser);
        return user;
      }

      return null;
    } catch (error) {
      console.error('❌ Error durante la autenticación:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Usamos el método signOut de Firebase para cerrar la sesión
      await signOut(this.auth);
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser ? userMapper(this.auth.currentUser) : null;
  }

  getUserUid(): string | null {
    const usuario = this.getCurrentUser();
    return usuario ? usuario.uid : null;
  }
}
