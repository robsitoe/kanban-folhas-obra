import { Injectable, signal } from '@angular/core';

const AUTH_KEY = 'kanban-auth-v1';
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  authenticated = signal(localStorage.getItem(AUTH_KEY) === 'true');

  login(username: string, password: string): boolean {
    const ok = username === VALID_USERNAME && password === VALID_PASSWORD;
    if (ok) {
      localStorage.setItem(AUTH_KEY, 'true');
      this.authenticated.set(true);
    }
    return ok;
  }

  logout(): void {
    localStorage.removeItem(AUTH_KEY);
    this.authenticated.set(false);
  }
}
