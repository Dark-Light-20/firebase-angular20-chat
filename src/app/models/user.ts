export interface User {
  uid: string;
  email: string;
  name?: string;
  photoUrl?: string;
  creationDate: Date;
  lastConnection: Date;
}
