import { User } from '../../models/user';
import { User as FireUser } from '@angular/fire/auth';

export const userMapper = (firebaseUser: FireUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email || '',
  name: firebaseUser.displayName || 'Usuario sin nombre',
  photoUrl: firebaseUser.photoURL || undefined,
  creationDate: new Date(),
  lastConnection: new Date(),
});
